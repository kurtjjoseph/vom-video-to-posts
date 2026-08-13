import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import {
  exportPostsAsJSON,
  exportPostsAsCSV,
  logExport,
} from '../services/export.js';
import { validatePost } from '../services/postGeneration.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/posts - List user's posts
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const platform = (req.query.platform as string) || undefined;
    const videoId = (req.query.videoId as string) || undefined;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };
    if (platform) where.platform = platform;
    if (videoId) where.videoId = videoId;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: { metrics: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      data: posts,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('List posts error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list posts',
    });
  }
});

// GET /api/posts/:id - Get post details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { metrics: true },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get post',
    });
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Validate post
    const errors = validatePost({
      platform: post.platform as 'linkedin' | 'twitter' | 'instagram',
      content: req.body.content || post.content,
      imageUrl: req.body.imageUrl,
    });

    if (errors.length > 0) {
      res.status(400).json({ error: errors[0] });
      return;
    }

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        content: req.body.content || undefined,
        imageUrl: req.body.imageUrl || undefined,
        status: req.body.status || undefined,
        scheduledFor: req.body.scheduledFor || undefined,
      },
      include: { metrics: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update post',
    });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.post.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete post',
    });
  }
});

// POST /api/posts/export/:videoId - Export posts
router.post(
  '/export/:videoId',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { format } = req.body;
      if (!format || !['json', 'csv'].includes(format)) {
        res.status(400).json({ error: 'Invalid format. Use json or csv.' });
        return;
      }

      // Verify ownership
      const video = await prisma.video.findUnique({
        where: { id: req.params.videoId },
      });

      if (!video || video.userId !== req.userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      let exportData: string;
      if (format === 'json') {
        exportData = await exportPostsAsJSON(req.params.videoId);
      } else {
        exportData = await exportPostsAsCSV(req.params.videoId);
      }

      await logExport(req.userId, req.params.videoId, format, exportData.length);

      const contentType =
        format === 'json' ? 'application/json' : 'text/csv';
      const filename = `posts-${req.params.videoId}-${Date.now()}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Export failed',
      });
    }
  }
);

export default router;
