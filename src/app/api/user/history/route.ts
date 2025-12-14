/**
 * Watch History API Routes
 * GET /api/user/history - List watch history
 * POST /api/user/history - Update watch progress
 * DELETE /api/user/history - Clear all history
 * 
 * Migrated from Prisma to Drizzle ORM using Repository pattern.
 * Requirements: 3.1, 3.4, 4.3, 6.3, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { WatchHistoryRepository } from '@/repositories';

// Repository instance
const watchHistoryRepository = new WatchHistoryRepository();

/**
 * GET /api/user/history
 * List watch history for the authenticated user, sorted by last watched time
 * Requirements: 6.3
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const history = await watchHistoryRepository.findByUser(user.id);

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get watch history error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch watch history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/history
 * Update watch progress for a VOD
 * Requirements: 4.3
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const {
      vodId,
      vodName,
      vodPic,
      episodeIndex,
      episodeName,
      position,
      duration,
      sourceIndex,
      sourceCategory,
    } = body;

    // Validate required fields
    if (!vodId || typeof vodId !== 'number') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'vodId is required and must be a number' },
        { status: 400 }
      );
    }

    if (!vodName || typeof vodName !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'vodName is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof position !== 'number' || position < 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'position is required and must be a non-negative number' },
        { status: 400 }
      );
    }

    // Validate sourceCategory if provided
    const validSourceCategory = sourceCategory === 'adult' ? 'adult' : 'normal';

    // Upsert watch history (update if exists, create if not)
    const historyEntry = await watchHistoryRepository.upsert({
      userId: user.id,
      vodId,
      vodName,
      vodPic: vodPic || '',
      episodeIndex: episodeIndex ?? 0,
      episodeName: episodeName || '',
      position,
      duration: duration ?? 0,
      sourceIndex: sourceIndex ?? 0,
      sourceCategory: validSourceCategory,
    });

    return NextResponse.json({ data: historyEntry }, { status: 200 });
  } catch (error: unknown) {
    console.error('Update watch history error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update watch history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/history
 * Clear all watch history for the authenticated user
 * Requirements: 6.4
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    await watchHistoryRepository.deleteAllByUser(user.id);

    return NextResponse.json(
      { message: 'Watch history cleared successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Clear watch history error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to clear watch history' },
      { status: 500 }
    );
  }
}
