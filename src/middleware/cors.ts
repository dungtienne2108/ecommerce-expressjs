import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://admin.socket.io'
    ];

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Không được phép truy cập từ nguồn này'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsConfig);

// Custom CORS error handler
export const corsErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err.message === 'Không được phép truy cập từ nguồn này') {
    res.status(403).json({
      error: 'CORS Error',
      message: 'Không được phép truy cập từ nguồn này',
      origin: req.get('Origin'),
    });
  } else {
    next(err);
  }
};