import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { handleUpload, requireBlobToken } from '../services/storage.js';
import type { HandleUploadBody } from '../services/storage.js';
import { transcribeVideo } from '../services/transcription.js';
import { generatePosts } from '../services/postGeneration.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/videos/upload - issue a client token, then record the result
//
// The video never passes through this API: a serverless request body cannot
// carry a 500MB file. @vercel/blob's handleUpload serves both halves of the
// exchange — it hands the browser a scoped, short-lived token, then calls
// onUploadCompleted once Blob has the file.
router.post('/upload', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const userId = req.userId;

    const result = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req as unknown as Request,
      token: requireBlobToken(),

      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
        maximumSizeInBytes: 500 * 1024 * 1024,
        // Survives the round trip so onUploadCompleted knows who uploaded.
        tokenPayload: JSON.stringify({ userId, pathname }),
      }),

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { userId: owner } = JSON.parse(tokenPayload || '{}');
        const video = await prisma.video.create({
          data: {
            userId: owner,
            title: blob.pathname,
            filename: blob.pathname,
            size: 0,
            blobUrl: blob.url,
            storagePath: blob.pathname,
            status: 'uploaded',
          },
        });
        await prisma.uploadLog.create({
          data: {
            userId: owner,
            videoId: video.id,
            action: 'upload',
            status: 'success',
            metadata: JSON.stringify({ url: blob.url }),
          },
        });
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

// GET /api/videos/by-url - resolve the row onUploadCompleted just created
//
// The browser uploads straight to Blob, so it learns the blob URL before it
// knows the video id. This closes that gap.
router.get('/by-url', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const url = String(req.query.url || '');
    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    const video = await prisma.video.findFirst({
      where: { userId: req.userId, blobUrl: url },
      orderBy: { createdAt: 'desc' },
    });

    if (!video) {
      // onUploadCompleted is a webhook from Blob and can land a moment late.
      res.status(404).json({ error: 'Video not recorded yet' });
      return;
    }

    res.json({ success: true, data: video });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Lookup failed',
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
