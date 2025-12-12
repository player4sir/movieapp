/**
 * Session Management Service
 *
 * Handles creation, retrieval, validation, and termination of user sessions.
 * Supports viewing active sessions with device info and terminating sessions
 * for security purposes.
 *
 * @module services/session.service
 */

import { SessionRepository } from '@/repositories/session.repository';
import type { UserSession as AdminUserSession } from '../types/admin';
import type { UserSession } from '@/db/schema';

// Create singleton repository instance
const sessionRepo = new SessionRepository();

/**
 * Default session expiry duration in days
 */
const DEFAULT_SESSION_EXPIRY_DAYS = 7;

/**
 * Parameters for creating a new session
 */
export interface CreateSessionParams {
  /** User ID for the session */
  userId: string;
  /** Refresh token for the session */
  refreshToken: string;
  /** Device information (e.g., "Chrome on Windows") */
  deviceInfo?: string;
  /** IP address of the client */
  ipAddress?: string;
  /** User agent string from the client */
  userAgent?: string;
  /** Session expiry date (defaults to 7 days from now) */
  expiresAt?: Date;
}

/**
 * Result of session operations
 */
export interface SessionOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Number of sessions affected */
  affected: number;
  /** Optional message */
  message?: string;
}

/**
 * Generates a unique ID for sessions
 */
function generateId(): string {
  return crypto.randomUUID();
}


/**
 * Transforms a database session record to AdminUserSession
 */
function toAdminUserSession(session: UserSession, currentSessionId?: string): AdminUserSession {
  return {
    id: session.id,
    userId: session.userId,
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastActivityAt: session.lastActivityAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: currentSessionId ? session.id === currentSessionId : false,
  };
}


/**
 * Creates a new user session
 *
 * @param params - Parameters for the session
 * @returns The created session
 *
 * @example
 * ```typescript
 * const session = await createSession({
 *   userId: 'user123',
 *   refreshToken: 'token_abc',
 *   deviceInfo: 'Chrome on Windows',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 * ```
 */
export async function createSession(params: CreateSessionParams): Promise<AdminUserSession> {
  const {
    userId,
    refreshToken,
    deviceInfo = '',
    ipAddress = '',
    userAgent = '',
    expiresAt,
  } = params;

  const sessionExpiresAt = expiresAt ?? new Date(Date.now() + DEFAULT_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const session = await sessionRepo.create({
    id: generateId(),
    userId,
    refreshToken,
    deviceInfo,
    ipAddress,
    userAgent,
    expiresAt: sessionExpiresAt,
  });

  return toAdminUserSession(session);
}

/**
 * Gets all active sessions for a user
 * Active sessions are those that have not expired
 *
 * @param userId - The user ID to get sessions for
 * @param currentSessionId - Optional current session ID to mark as current
 * @returns List of active sessions sorted by last activity (newest first)
 *
 * @example
 * ```typescript
 * const sessions = await getActiveSessions('user123', 'current_session_id');
 * ```
 */
export async function getActiveSessions(
  userId: string,
  currentSessionId?: string
): Promise<AdminUserSession[]> {
  const sessions = await sessionRepo.findActiveByUser(userId);
  return sessions.map((session) => toAdminUserSession(session, currentSessionId));
}

/**
 * Gets a session by its refresh token
 *
 * @param refreshToken - The refresh token to look up
 * @returns The session if found and valid, null otherwise
 */
export async function getSessionByRefreshToken(refreshToken: string): Promise<AdminUserSession | null> {
  const now = new Date();
  const session = await sessionRepo.findByRefreshToken(refreshToken);

  if (!session || session.expiresAt <= now) {
    return null;
  }

  return toAdminUserSession(session);
}

/**
 * Gets a session by its ID
 *
 * @param sessionId - The session ID to look up
 * @returns The session if found, null otherwise
 */
export async function getSessionById(sessionId: string): Promise<AdminUserSession | null> {
  const session = await sessionRepo.findById(sessionId);

  if (!session) {
    return null;
  }

  return toAdminUserSession(session);
}



/**
 * Validates a session by its refresh token
 * Checks if the session exists, is not expired, and the user is active
 *
 * @param refreshToken - The refresh token to validate
 * @returns Object with validation result and session/user info
 */
export async function validateSession(refreshToken: string): Promise<{
  valid: boolean;
  session: AdminUserSession | null;
  userId: string | null;
  reason?: string;
}> {
  const now = new Date();
  const sessionWithUser = await sessionRepo.findByRefreshToken(refreshToken);

  if (!sessionWithUser) {
    return { valid: false, session: null, userId: null, reason: 'Session not found' };
  }

  if (sessionWithUser.expiresAt <= now) {
    return { valid: false, session: null, userId: sessionWithUser.userId, reason: 'Session expired' };
  }

  if (sessionWithUser.user.status === 'disabled') {
    return { valid: false, session: null, userId: sessionWithUser.userId, reason: 'User account disabled' };
  }

  return {
    valid: true,
    session: toAdminUserSession(sessionWithUser),
    userId: sessionWithUser.userId,
  };
}

/**
 * Updates the last activity timestamp for a session
 *
 * @param sessionId - The session ID to update
 * @returns The updated session or null if not found
 */
export async function updateSessionActivity(sessionId: string): Promise<AdminUserSession | null> {
  try {
    await sessionRepo.updateActivity(sessionId);
    const session = await sessionRepo.findById(sessionId);
    return session ? toAdminUserSession(session) : null;
  } catch {
    return null;
  }
}

/**
 * Terminates a specific session by its ID
 * This invalidates the session token immediately
 *
 * @param sessionId - The session ID to terminate
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * const result = await terminateSession('session123');
 * if (result.success) {
 *   console.log('Session terminated');
 * }
 * ```
 */
export async function terminateSession(sessionId: string): Promise<SessionOperationResult> {
  try {
    await sessionRepo.delete(sessionId);

    return {
      success: true,
      affected: 1,
      message: 'Session terminated successfully',
    };
  } catch {
    return {
      success: false,
      affected: 0,
      message: 'Session not found or already terminated',
    };
  }
}

/**
 * Terminates all sessions for a specific user
 * This forces re-authentication for the user on all devices
 *
 * @param userId - The user ID whose sessions should be terminated
 * @returns Result of the operation with count of terminated sessions
 *
 * @example
 * ```typescript
 * const result = await terminateAllUserSessions('user123');
 * console.log(`Terminated ${result.affected} sessions`);
 * ```
 */
export async function terminateAllUserSessions(userId: string): Promise<SessionOperationResult> {
  const count = await sessionRepo.deleteAllByUserWithCount(userId);

  return {
    success: true,
    affected: count,
    message: `Terminated ${count} session(s)`,
  };
}


/**
 * Terminates all sessions for a user except the specified one
 * Useful for "logout from all other devices" functionality
 *
 * @param userId - The user ID whose sessions should be terminated
 * @param exceptSessionId - The session ID to keep active
 * @returns Result of the operation with count of terminated sessions
 */
export async function terminateOtherSessions(
  userId: string,
  exceptSessionId: string
): Promise<SessionOperationResult> {
  const count = await sessionRepo.deleteOthersByUser(userId, exceptSessionId);

  return {
    success: true,
    affected: count,
    message: `Terminated ${count} other session(s)`,
  };
}

/**
 * Cleans up expired sessions from the database
 * Should be run periodically as a maintenance task
 *
 * @returns Number of expired sessions deleted
 */
export async function cleanupExpiredSessions(): Promise<number> {
  return sessionRepo.deleteExpiredWithCount();
}

/**
 * Gets the count of active sessions for a user
 *
 * @param userId - The user ID to count sessions for
 * @returns Number of active sessions
 */
export async function getActiveSessionCount(userId: string): Promise<number> {
  return sessionRepo.countActiveByUser(userId);
}

/**
 * Checks if a user has any active sessions
 *
 * @param userId - The user ID to check
 * @returns True if the user has at least one active session
 */
export async function hasActiveSessions(userId: string): Promise<boolean> {
  const count = await getActiveSessionCount(userId);
  return count > 0;
}
