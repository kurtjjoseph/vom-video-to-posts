import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard/stats - Get dashboard statistics
router.get(
  '/stats',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get user stats
      const videosCount = await prisma.video.count({
        where: { userId: req.userId },
      });

      const postsCount = await prisma.post.count({
        where: { userId: req.userId },
      });

      const videos = await prisma.video.findMany({
        where: { userId: req.userId },
        select: { status: true },
      });

      const postsPerPlatform = await prisma.post.groupBy({
        by: ['platform'],
        where: { userId: req.userId },
        _count: true,
      });

      const recentUploads = await prisma.uploadLog.findMany({
        where: {
          userId: req.userId,
          action: 'upload',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const stats = {
        totalVideos: videosCount,
        totalPosts: postsCount,
        videosByStatus: videos.reduce(
          (acc, v) => {
            acc[v.status] = (acc[v.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        postsByPlatform: postsPerPlatform.reduce(
          (acc, p) => {
            acc[p.platform] = p._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        recentUploads: recentUploads.map((log) => ({
          videoId: log.videoId,
          uploadedAt: log.createdAt,
        })),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get statistics',
      });
    }
  }
);

// GET /api/dashboard/analytics - Get detailed analytics
router.get(
  '/analytics',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const timeframe = req.query.timeframe as string || '30days';
      const now = new Date();
      const startDate = new Date();

      if (timeframe === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (timeframe === '90days') {
        startDate.setDate(now.getDate() - 90);
      }

      // Get posts by date
      const posts = await prisma.post.findMany({
        where: {
          userId: req.userId,
          createdAt: { gte: startDate },
        },
        select: { createdAt: true, platform: true },
      });

      // Group posts by date
      const postsByDate = posts.reduce(
        (acc, post) => {
          const date = post.createdAt.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { total: 0, platforms: {} };
          }
          acc[date].total += 1;
          acc[date].platforms[post.platform] =
            (acc[date].platforms[post.platform] || 0) + 1;
          return acc;
        },
        {} as Record<
          string,
          { total: number; platforms: Record<string, number> }
        >
      );

      // Get metrics data
      const metrics = await prisma.metrics.findMany({
        where: {
          post: {
            userId: req.userId,
            createdAt: { gte: startDate },
          },
        },
      });

      const totalMetrics = metrics.reduce(
        (acc, m) => {
          acc.views += m.views;
          acc.likes += m.likes;
          acc.comments += m.comments;
          acc.shares += m.shares;
          acc.clicks += m.clicks;
          return acc;
        },
        { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }
      );

      res.json({
        success: true,
        data: {
          timeframe,
          postsByDate,
          metrics: totalMetrics,
          averageMetrics:
            metrics.length > 0
              ? {
                  views: Math.round(totalMetrics.views / metrics.length),
                  likes: Math.round(totalMetrics.likes / metrics.length),
                  comments: Math.round(totalMetrics.comments / metrics.length),
                  shares: Math.round(totalMetrics.shares / metrics.length),
                  clicks: Math.round(totalMetrics.clicks / metrics.length),
                }
              : {},
        },
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get analytics',
      });
    }
  }
);

// GET /api/dashboard/activity - Get activity log
router.get(
  '/activity',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.uploadLog.findMany({
          where: { userId: req.userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.uploadLog.count({ where: { userId: req.userId } }),
      ]);

      res.json({
        data: logs,
        total,
        page,
        limit,
      });
    } catch (error) {
      console.error('Activity log error:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get activity',
      });
    }
  }
);

export default router;
