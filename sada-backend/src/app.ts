import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import roomsRoutes from './routes/rooms.routes';
import gemRoutes from './routes/gem.routes';
import followRoutes from './routes/follow.routes';
import categoryRoutes from './routes/category.routes';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/rooms', roomsRoutes);
  app.use('/gems', gemRoutes);
  app.use('/follow', followRoutes);
  app.use('/categories', categoryRoutes);

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
