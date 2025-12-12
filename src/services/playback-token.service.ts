import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-dev-only-do-not-use-in-prod';
const TOKEN_EXPIRY = '3h'; // Token valid for 3 hours

// Log warning if using fallback secret in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET && !process.env.JWT_SECRET) {
  console.warn('WARNING: Using fallback JWT secret in production! Set NEXTAUTH_SECRET or JWT_SECRET environment variable.');
}

export interface PlaybackTokenPayload {
    url: string;
    isPreview: boolean;
    userId?: string;
    vodId?: number;
    exp?: number;
    iat?: number;
}

/**
 * Generate a signed playback token
 */
export function generatePlaybackToken(payload: Omit<PlaybackTokenPayload, 'exp' | 'iat'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a playback token
 */
export function verifyPlaybackToken(token: string): PlaybackTokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as PlaybackTokenPayload;
    } catch (error) {
        console.warn('Invalid playback token:', error);
        return null;
    }
}
