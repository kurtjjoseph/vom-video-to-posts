import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { createSignedUpload } from '../services/storage.js';
import { transcribeVideo } from '../services/transcription.js';
import { generatePosts } from '../services/postGeneration.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/videos/upload-url - mint a direct-to-storage upload URL
//
// The video itself never passes through this API: a serverless request body
// cannot carry a 500MB file. The browser PUTs the file to the signed URL
// returned here, then calls /:id/complete below.
router.post('/upload-url', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { filename, size, title } = req.body as {
      filename?: string;
      size?: number;
      title?: string;
    };

    if (!filename || typeof size !== 'number') {
      res.status(400).json({ error: 'filename and size are required' });
      return;
    }

    const MAX_BYTES = 500 * 1024 * 1024;
    if (size > MAX_BYTES) {
      res.status(413).json({ error: 'Video exceeds the 500MB limit' });
      return;
    }

    const { path, signedUrl, token } = await createSignedUpload(req.userId, filename);

    // Record the video up front so the client has an id to report back against.
    const video = await prisma.video.create({
      data: {
        userId: req.userId,
        title: title || filename,
        filename,
        size,
        storagePath: path,
        status: 'pending',
      },
    });

    res.json({
      success: true,
      data: { videoId: video.id, uploadUrl: signedUrl, token, path },
    });
  } catch (error) {
    console.error('Upload URL error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not create upload URL',
    });
  }
});

// POST /api/videos/:id/complete - browser reports the direct upload finished
router.post('/:id/complete', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const video = await prisma.video.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const updated = await prisma.video.update({
      where: { id: video.id },
      data: { status: 'uploaded' },
    });

    await prisma.uploadLog.create({
      data: {
        userId: req.userId,
        videoId: video.id,
        action: 'upload',
        status: 'success',
        metadata: JSON.stringify({ size: video.size, filename: video.filename }),
      },
    });

    res.json({ success: true, data: updated, message: 'Video uploaded successfully' });
  } catch (error) {
    console.error('Upload completion error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not finalize upload',
    });
  }
});

// GET /api/videos - List user's videos
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { userId: req.userId },
        skip,
        take: limit,
        include: { posts: { select: { id: true, platform: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.video.count({ where: { userId: req.userId } }),
    ]);

    res.json({
      data: videos,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list videos',
    });
  }
});

// GET /api/videos/:id - Get video details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: {
        posts: {
          select: {
            id: true,
            platform: true,
            content: true,
            imageUrl: true,
            status: true,
          },
        },
      },
    });

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    if (video.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    res.json({ success: true, data: video });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get video',
    });
  }
});

// POST /api/videos/:id/transcribe - Transcribe video
router.post(
  '/:id/transcribe',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const video = await prisma.video.findUnique({
        where: { id: req.params.id },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (video.userId !== req.userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      if (!video.blobUrl && !video.s3Url) {
        res.status(400).json({ error: 'Video URL not available' });
        return;
      }

      const transcription = await transcribeVideo(video.id, '');

      res.json({
        success: true,
        data: { transcription },
        message: 'Video transcribed successfully',
      });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Transcription failed',
      });
    }
  }
);

// POST /api/videos/:id/generate-posts - Generate posts
router.post(
  '/:id/generate-posts',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const video = await prisma.video.findUnique({
        where: { id: req.params.id },
      });

      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (video.userId !== req.userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      if (!video.transcription) {
        res.status(400).json({
          error: 'Video must be transcribed before generating posts',
        });
        return;
      }

      const posts = await generatePosts(video.id, video.transcription, req.userId);

      res.json({
        success: true,
        data: posts,
        message: 'Posts generated successfully',
      });
    } catch (error) {
      console.error('Post generation error:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Post generation failed',
      });
    }
  }
);

// DELETE /api/videos/:id - Delete video
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
    });

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    if (video.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.video.delete({
      where: { id: req.params.id },
    });

    await prisma.uploadLog.create({
      data: {
        userId: req.userId,
        videoId: video.id,
        action: 'delete',
        status: 'success',
      },
    });

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete video',
    });
  }
});

export default router;
