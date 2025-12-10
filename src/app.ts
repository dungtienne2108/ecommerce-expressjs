// src/app.ts
import express, { Application, Request, Response } from 'express';
import { applyBasicMiddleware } from './middleware';
import { corsMiddleware, corsErrorHandler } from './middleware/cors';
import { generalRateLimiter } from './middleware/rateLimiter';
import { globalErrorHandler } from './middleware/errorHandler';
import rootRouter from './routes';

export function createApp(): Application {
  const app = express();

  // 0) Trust proxy - quan trọng khi chạy sau Vercel, Nginx, Cloudflare, etc.
  // Cần thiết để express-rate-limit và các middleware khác hoạt động đúng
  app.set('trust proxy', 1);

  // 1) CORS PHẢI ĐẶT TRƯỚC HẾT để handle preflight requests
  app.use(corsMiddleware);
  app.use(corsErrorHandler);

  // 2) Middleware cơ bản (helmet, parsers, logger)
  applyBasicMiddleware(app);

  // 3) Rate limiting chung
  app.use(generalRateLimiter);

  // 4) Routes
  app.use('/', rootRouter);

  // 5) 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found', code: 'ROUTE_NOT_FOUND' });
  });

  // 6) Error handler cuối cùng
  app.use(globalErrorHandler);

  return app;
}
