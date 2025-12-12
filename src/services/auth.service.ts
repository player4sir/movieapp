/**
 * Authentication Service
 * Handles user registration, login, and JWT token management
 * 
 * Migrated from Prisma to Drizzle ORM using Repository pattern.
 * Requirements: 3.1, 3.2, 3.4
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository, DuplicateError } from '@/repositories';
import { User } from '@/db/schema';
import {
  AuthResult,
  TokenPayload,
  UserProfile,
  AUTH_ERRORS,
} from '@/types/auth';
import logger from '@/lib/logger';

// Repository instances
const userRepository = new UserRepository();

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret() + '_refresh';
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, username: payload.username, role: payload.role },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, username: payload.username, role: payload.role },
    getRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function validateAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw { ...AUTH_ERRORS.TOKEN_EXPIRED };
    }
    throw { ...AUTH_ERRORS.INVALID_TOKEN };
  }
}

export function validateRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, getRefreshSecret()) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw { ...AUTH_ERRORS.TOKEN_EXPIRED };
    }
    throw { ...AUTH_ERRORS.INVALID_TOKEN };
  }
}

/**
 * Convert a User entity to a UserProfile DTO.
 * Handles the mapping from Drizzle schema types to API response types.
 */
function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname ?? '',
    avatar: user.avatar ?? '',
    role: user.role ?? 'user',
    status: user.status ?? 'active',
    memberLevel: user.memberLevel ?? 'free',
    memberExpiry: user.memberExpiry,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    referralCode: user.referralCode,
  };
}

/**
 * Generate a unique ID for new entities.
 * Uses crypto.randomUUID for secure random IDs.
 */
function generateId(): string {
  return crypto.randomUUID();
}

// Update register function to handle referral code
import { processReferral, generateReferralCode } from './referral.service';

export async function register(
  username: string,
  password: string,
  nickname?: string,
  inviteCode?: string
): Promise<AuthResult> {
  // Check if username already exists using repository
  const existingUser = await userRepository.findByUsername(username);

  if (existingUser) {
    throw { ...AUTH_ERRORS.USERNAME_EXISTS };
  }

  const passwordHash = await hashPassword(password);

  // Generate a random referral code for the new user
  const myReferralCode = await generateReferralCode();

  try {
    // Create user using repository
    const user = await userRepository.create({
      id: generateId(),
      username,
      passwordHash,
      nickname: nickname || username,
      referralCode: myReferralCode,
    });

    // Process referral if invite code is provided
    if (inviteCode && user.id) {
      try {
        // Run async side effect, do not block registration return significantly
        // Await is safest to ensure rewards are processed before user logs in.
        await processReferral(user.id, inviteCode);
      } catch (referralError) {
        // Log error but do not fail registration
        logger.error({ err: referralError, userId: user.id }, 'Failed to process referral');
      }
    }

    // Update lastLoginAt for the new user
    const updatedUser = await userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role ?? 'user',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: toUserProfile(updatedUser ?? user),
    };
  } catch (error) {
    // Handle duplicate username error from repository
    if (error instanceof DuplicateError) {
      throw { ...AUTH_ERRORS.USERNAME_EXISTS };
    }
    throw error;
  }
}

export async function login(
  username: string,
  password: string
): Promise<AuthResult> {
  // Find user by username using repository
  const user = await userRepository.findByUsername(username);

  if (!user) {
    throw { ...AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  if (user.status === 'disabled') {
    throw { ...AUTH_ERRORS.USER_DISABLED };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw { ...AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  // Update lastLoginAt using repository
  const updatedUser = await userRepository.update(user.id, {
    lastLoginAt: new Date(),
  });

  const tokenPayload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role ?? 'user',
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    user: toUserProfile(updatedUser ?? user),
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthResult> {
  const payload = validateRefreshToken(refreshToken);

  // Find user by ID using repository
  const userWithGroup = await userRepository.findById(payload.userId);

  if (!userWithGroup) {
    throw { ...AUTH_ERRORS.INVALID_TOKEN };
  }

  if (userWithGroup.status === 'disabled') {
    throw { ...AUTH_ERRORS.USER_DISABLED };
  }

  const tokenPayload: TokenPayload = {
    userId: userWithGroup.id,
    username: userWithGroup.username,
    role: userWithGroup.role ?? 'user',
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    user: toUserProfile(userWithGroup),
  };
}

export async function validateToken(token: string): Promise<UserProfile> {
  const payload = validateAccessToken(token);

  // Find user by ID using repository
  const userWithGroup = await userRepository.findById(payload.userId);

  if (!userWithGroup) {
    throw { ...AUTH_ERRORS.INVALID_TOKEN };
  }

  if (userWithGroup.status === 'disabled') {
    throw { ...AUTH_ERRORS.USER_DISABLED };
  }

  return toUserProfile(userWithGroup);
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  // Find user by ID using repository
  const userWithGroup = await userRepository.findById(userId);

  if (!userWithGroup) {
    return null;
  }

  return toUserProfile(userWithGroup);
}

/**
 * Extract Bearer token from request headers
 */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}