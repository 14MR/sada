import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authenticate } from './middleware/auth';
import { sanitize } from './middleware/sanitize';
import { requestLogger } from './middleware/requestLogger';
import logger from './config/logger';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import roomsRoutes from './routes/rooms.routes';
import gemRoutes from './routes/gem.routes';
import followRoutes from './routes/follow.routes';
import categoryRoutes from './routes/category.routes';
import creatorRoutes from './routes/creator.routes';
import moderationRoutes from './routes/moderation.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import recordingRoutes from './routes/recording.routes';
import reactionRoutes from './routes/reaction.routes';
import audioRoutes from './routes/audio.routes';

function getCorsOptions(): cors.CorsOptions {
  const origins = process.env.CORS_ORIGINS;
  if (!origins || origins === '*') {
    return {};
  }
  return {
    origin: origins.split(',').map(o => o.trim()),
  };
}

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many auth attempts, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});

export function createApp() {
  const app = express();

  app.use(cors(getCorsOptions()));
  app.use(express.json());
  app.use(sanitize);

  // Request logging
  app.use(requestLogger);

  // Rate limiting BEFORE auth so unauthenticated brute-force attempts are also throttled
  app.use('/auth', authLimiter);
  app.use(apiLimiter);

  // Health check (before authenticate, so it's always accessible)
  app.get('/health', async (req, res) => {
    try {
      const { AppDataSource } = await import('./config/database');
      if (AppDataSource.isInitialized) {
        res.json({ status: 'ok', uptime: process.uptime(), memory: process.memoryUsage().heapUsed });
      } else {
        res.status(503).json({ status: 'degraded', error: 'Database not connected' });
      }
    } catch {
      res.status(503).json({ status: 'degraded', error: 'Database check failed' });
    }
  });

  // Auth middleware applied globally (skips signin and health)
  app.use(authenticate);

  // Routes
  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/rooms', roomsRoutes);
  app.use('/gems', gemRoutes);
  app.use('/follow', followRoutes);
  app.use('/categories', categoryRoutes);
  app.use('/creator', creatorRoutes);
  app.use('/moderation', moderationRoutes);
  app.use('/admin', adminRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/withdrawals', withdrawalRoutes);
  app.use('/recordings', recordingRoutes);
  app.use('/reactions', reactionRoutes);
  app.use('/audio', audioRoutes);

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export default createApp;
