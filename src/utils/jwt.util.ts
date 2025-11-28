import jwt from 'jsonwebtoken';
import { JwtPayload, RefreshTokenPayload } from '../types/auth.types';
import dotenv from 'dotenv';
import { JwtErrorHandler } from '../errors/JwtErrorHandler';

dotenv.config();

export class JwtUtils {
  private static readonly ACCESS_SECRET = (() => {
    if (!process.env.JWT_SECRET) {
      throw new Error('Nghiêm trọng: Biến môi trường JWT_SECRET không được đặt');
    }
    return process.env.JWT_SECRET;
  })();
  private static readonly REFRESH_SECRET = (() => {
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        'Nghiêm trọng: Biến môi trường JWT_REFRESH_SECRET không được đặt'
      );
    }
    return process.env.JWT_REFRESH_SECRET;
  })();
  private static readonly ACCESS_EXPIRES_IN = (() => {
    if (!process.env.JWT_EXPIRES_IN) {
      throw new Error(
        'Nghiêm trọng: Biến môi trường JWT_EXPIRES_IN không được đặt'
      );
    }
    return process.env.JWT_EXPIRES_IN;
  })();

  private static readonly REFRESH_EXPIRES_IN = (() => {
    if (!process.env.JWT_REFRESH_EXPIRES_IN) {
      throw new Error(
        'Nghiêm trọng: Biến môi trường JWT_REFRESH_EXPIRES_IN không được đặt'
      );
    }
    return process.env.JWT_REFRESH_EXPIRES_IN;
  })();

  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string): string {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      type: 'refresh',
    };

    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.ACCESS_SECRET) as JwtPayload;
    } catch (error) {
      JwtErrorHandler.handle(error);
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.REFRESH_SECRET) as RefreshTokenPayload;
    } catch (error) {
      JwtErrorHandler.handle(error);
    }
  }

  /**
   * Get token expiration time in seconds
   */
  static getTokenExpirationTime(): number {
    const expiresIn = this.ACCESS_EXPIRES_IN;

    // Convert to seconds
    if (typeof expiresIn === 'string') {
      const unit = expiresIn.slice(-1);
      const value = parseInt(expiresIn.slice(0, -1));

      switch (unit) {
        case 's':
          return value;
        case 'm':
          return value * 60;
        case 'h':
          return value * 60 * 60;
        case 'd':
          return value * 24 * 60 * 60;
        default:
          return 24 * 60 * 60; // Default 24 hours
      }
    }

    return typeof expiresIn === 'number' ? expiresIn : 24 * 60 * 60;
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string): string {
    const payload = {
      userId,
      type: 'password_reset',
    };

    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: '1h', // Password reset tokens expire in 1 hour
    });
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.ACCESS_SECRET) as any;

      if (payload.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return { userId: payload.userId };
    } catch (error) {
      JwtErrorHandler.handle(error);
    }
  }
}
