import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from './config/database';
import { authenticate, requireAuth } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import roomsRoutes from './routes/rooms.routes';
import gemRoutes from './routes/gem.routes';
import followRoutes from './routes/follow.routes';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many auth attempts, please try again later.',
});

export function createApp() {
  const app = express();

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [];

  app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
  }));
  app.use(express.json());

  // General rate limiting
  app.use(generalLimiter);

  // Auth rate limiting
  app.use('/auth', authLimiter);

  // Global JWT authentication (populates req.user if token present)
  app.use(authenticate);

  // Public routes (no auth required)
  app.use('/auth', authRoutes);

  // Protected routes (require valid JWT)
  app.use('/users', requireAuth, usersRoutes);
  app.use('/rooms', roomsRoutes);
  app.use('/gems', requireAuth, gemRoutes);
  app.use('/follow', requireAuth, followRoutes);

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
