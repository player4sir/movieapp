/**
 * Authentication types for the Movie Streaming App
 */

export type MemberLevel = 'free' | 'vip' | 'svip';

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  memberLevel: MemberLevel;
  memberExpiry: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  referralCode?: string | null;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: '用户名或密码错误',
  },
  USERNAME_EXISTS: {
    code: 'USERNAME_EXISTS',
    message: '该用户名已被注册',
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or expired token',
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Token has expired',
  },
  USER_DISABLED: {
    code: 'USER_DISABLED',
    message: '该账号已被禁用',
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access denied',
  },
} as const;
