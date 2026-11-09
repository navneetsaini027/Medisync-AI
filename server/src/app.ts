import './config/env.js';
import cors from 'cors';
import express from 'express';
import { serverConfig } from './config/server.js';
import { requestLogger } from './utils/logger.js';
import healthRoutes from './routes/health.routes.js';
import reportRoutes from './routes/report.routes.js';

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || serverConfig.allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
  }));
  app.use(express.json({ limit: '250mb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/reports', reportRoutes);

  return app;
}

export default createApp();
