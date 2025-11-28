import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import express from 'express';

// Helmet configuration
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } ,
};

// Apply basic middleware
export const applyBasicMiddleware = (app: Application): void => {
  // Security middleware
  app.use(helmet(helmetOptions));

  // Body parser middleware
  app.use(express.json({ 
    limit: process.env.JSON_LIMIT || '10mb',
    verify: (req: Request, res: Response, buf: Buffer) => {
      // Store raw body for webhook verification if needed
      (req as any).rawBody = buf;
    }
  }));

  app.use(express.urlencoded({ 
    extended: true,
    limit: process.env.URL_ENCODED_LIMIT || '10mb'
  }));

  // Custom middleware for request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  console.log('✅ Middleware cơ bản đã chạy thành công');
};