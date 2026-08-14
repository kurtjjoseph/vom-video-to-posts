import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import videosRouter from './routes/videos.js';
import postsRouter from './routes/posts.js';
import dashboardRouter from './routes/dashboard.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:3000',
      'https://vom-video-to-posts.vercel.app',
    ],
    credentials: true,
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/videos', videosRouter);
app.use('/api/posts', postsRouter);
app.use('/api/dashboard', dashboardRouter);

// Auth test endpoint
app.get('/api/auth/test', authMiddleware, (req, res) => {
  res.json({
    authenticated: true,
    userId: (req as any).userId,
    email: (req as any).userEmail,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// On Vercel the platform owns the listener and imports this module; bind a
// port only when the file is run directly (local dev, container host).
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

export default app;
