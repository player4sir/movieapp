/**
 * DELETE /api/user/favorites/[vodId]
 * Remove a VOD from user's favorites
 * 
 * Migrated from Prisma to Drizzle ORM using Repository pattern.
 * Requirements: 3.1, 3.4, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { FavoriteRepository } from '@/repositories';

// Repository instance
const favoriteRepository = new FavoriteRepository();

interface RouteParams {
  params: Promise<{ vodId: string }>;
}

/**
 * DELETE /api/user/favorites/[vodId]
 * Remove a specific VOD from user's favorites
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;
  const { vodId: vodIdParam } = await params;
  const vodId = parseInt(vodIdParam, 10);

  if (isNaN(vodId)) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid vodId parameter' },
      { status: 400 }
    );
  }

  try {
    // Check if favorite exists
    const existing = await favoriteRepository.findByUserAndVod(user.id, vodId);

    if (!existing) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Favorite not found' },
        { status: 404 }
      );
    }

    // Delete the favorite
    await favoriteRepository.delete(user.id, vodId);

    return NextResponse.json(
      { message: 'Favorite removed successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Remove favorite error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
