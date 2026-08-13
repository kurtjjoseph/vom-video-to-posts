import express, { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { uploadVideo } from '../services/storage.js';
import { transcribeVideo } from '../services/transcription.js';
import { generatePosts } from '../services/postGeneration.js';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

// POST /api/videos - Upload video
router.post(
  '/',
  authMiddleware,
  upload.single('video'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const title = req.body.title || req.file.originalname;
      const filename = req.file.originalname;
      const size = req.file.size;

      // Upload to storage
      const fileUrl = await uploadVideo(req.file.buffer, filename);

      // Create video record
      const video = await prisma.video.create({
        data: {
          userId: req.userId,
          title,
          filename,
          size,
          blobUrl: fileUrl.includes('blob.vercel') ? fileUrl : undefined,
          s3Url: fileUrl.includes('amazonaws') ? fileUrl : undefined,
          status: 'uploaded',
        },
      });

      // Log upload
      await prisma.uploadLog.create({
        data: {
          userId: req.userId,
          videoId: video.id,
          action: 'upload',
          status: 'success',
          metadata: JSON.stringify({ size, filename }),
        },
      });

      res.json({
        success: true,
        data: video,
        message: 'Video uploaded successfully',
      });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

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
