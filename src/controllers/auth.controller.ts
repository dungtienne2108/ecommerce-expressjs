import { Request, Response, NextFunction } from 'express';
import { authService } from '../config/container';
import { ApiResponse } from '../types/common';
import { ValidationError } from '../errors/AppError';
import { asyncHandler } from '../middleware/errorHandler';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  PasswordResetInput,
  PasswordResetConfirmInput,
} from '../types/auth.types';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
  refreshTokenSchema,
} from '../validators/auth.validators';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details?.[0]?.message || 'Validation error');
    }

    const userData: RegisterInput = value;
    const result = await authService.register(userData);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Đăng ký thành công',
    };

    res.status(201).json(response);
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details?.[0]?.message || 'Validation error');
    }

    const loginData: LoginInput = value;
    console.log('loginData', loginData);
    const result = await authService.login(loginData);
    console.log('result', result);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Đăng nhập thành công',
    };

    res.json(response);
  });

  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details?.[0]?.message || 'Validation error');
    }

    const { refreshToken } = value;
    const result = await authService.refreshToken(refreshToken);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Làm mới token thành công',
    };

    res.json(response);
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    await authService.logout(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Đăng xuất thành công',
    };

    res.json(response);
  });

  getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const user = await authService.getProfile(userId);

    if (!user) {
      throw new ValidationError('User not found');
    }

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.json(response);
  });

  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    // Validate request body
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details?.[0]?.message || 'Validation error');
    }

    const passwordData: ChangePasswordInput = value;
    await authService.changePassword(userId, passwordData);

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully',
    };

    res.json(response);
  });

  requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const { error, value } = passwordResetSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details?.[0]?.message || 'Validation error');
    }

    const resetData: PasswordResetInput = value;
    const result = await authService.requestPasswordReset(resetData);

    // Send email with reset token
    // await emailService.sendPasswordResetEmail(resetData.email, result.token);

    const response: ApiResponse = {
      success: true,
      message: 'Vui lòng kiểm tra email để lấy mã xác thực.',
    };

    res.json(response);
  });

  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const { error, value } = passwordResetConfirmSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details?.[0]?.message || 'Validation error');
    }

    const resetData: PasswordResetConfirmInput = value;
    await authService.resetPassword(resetData);

    const response: ApiResponse = {
      success: true,
      message: 'Password reset successfully',
    };

    res.json(response);
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    await authService.verifyEmail(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Email verified successfully',
    };

    res.json(response);
  });
}

export const authController = new AuthController();