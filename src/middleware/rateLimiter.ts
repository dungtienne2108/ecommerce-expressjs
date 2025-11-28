import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 phút
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5'), // Tối đa 5 req mỗi IP trong khoảng thời gian này
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, 
  legacyHeaders: false, 
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round((req as any).rateLimit.resetTime / 1000),
    });
  },
});

// Rate limiter for password reset
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round((req as any).rateLimit.resetTime / 1000),
    });
  },
});

export const vnpayRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10,
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// General API rate limiter
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 req mỗi IP trong khoảng thời gian này
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});