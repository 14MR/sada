import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authenticate } from './middleware/auth';
import { sanitize } from './middleware/sanitize';
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

  // Auth middleware applied globally (skips signin and health)
  app.use(authenticate);

  // Rate limiting
  app.use('/auth', authLimiter);
  app.use(apiLimiter);

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

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export default createApp;
