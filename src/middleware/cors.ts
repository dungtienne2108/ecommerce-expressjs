import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';

// Danh sách origins được phép (export để dùng ở Socket.IO)
export const getAllowedOrigins = (): string[] => {
  return (
    process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://admin.socket.io',
      'https://classy-sho.vercel.app',
      'https://unacceptably-nonrealizable-erick.ngrok-free.dev',
    ]
  );
};

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Log chỉ trong development
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== CORS Check ===');
      console.log('Request Origin:', origin || 'NO ORIGIN');
      console.log('Allowed Origins:', allowedOrigins);
    }

    // Cho phép request không có origin (như mobile app hoặc Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Kiểm tra exact match
    const isAllowed = allowedOrigins.includes(origin);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Is Allowed:', isAllowed);
    }

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error('❌ CORS BLOCKED - Origin not in allowed list:', origin);
      const error = new Error(
        `CORS policy violation: Origin ${origin} not allowed`
      );
      (error as any).corsError = true;
      callback(error);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Custom-Header',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsConfig);

// Custom CORS error handler - phải được đặt KHÔNG phải là error middleware thường
export const corsErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if ((err as any).corsError) {
    console.error('❌ CORS Error:', {
      origin: req.get('origin'),
      message: err.message,
      method: req.method,
      path: req.path,
    });

    res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.get('origin'),
      requestedPath: req.path,
    });
  } else {
    next(err);
  }
};
