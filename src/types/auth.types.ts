import { User , UserStatus, Gender} from '@prisma/client';

// Register input
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  birthday?: Date;
  gender?: Gender;
}

// Login input  
export interface LoginInput {
  email: string;
  password: string;
}

// Auth response
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  birthday?: Date | null;
  avatarUrl?: string;
  roles?: string[];
  walletAddress?: string;
  status: UserStatus;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// JWT payload for access token
export interface JwtPayload {
  userId: string;
  email: string;
  status: UserStatus;
  roles: string[];
  iat?: number;
  exp?: number;
}

// JWT payload for refresh token
export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

// JWT payload for password reset token
export interface PasswordResetTokenPayload {
  userId: string;
  type: 'password_reset';
  iat?: number;
  exp?: number;
}

// Password reset request input
export interface PasswordResetInput {
  email: string;
}

// Password reset confirmation input
export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

// Change password input
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}