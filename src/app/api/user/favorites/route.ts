/**
 * Favorites API Routes
 * GET /api/user/favorites - List user favorites
 * POST /api/user/favorites - Add to favorites
 * 
 * Migrated from Prisma to Drizzle ORM using Repository pattern.
 * Requirements: 3.1, 3.4, 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { FavoriteRepository } from '@/repositories';

// Repository instance
const favoriteRepository = new FavoriteRepository();

/**
 * GET /api/user/favorites
 * List all favorites for the authenticated user
 * Query params:
 * - vodId: Check if specific VOD is favorited (returns { isFavorite: boolean })
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;
  const searchParams = request.nextUrl.searchParams;
  const vodId = searchParams.get('vodId');

  try {
    // Check single VOD favorite status
    if (vodId) {
      const favorite = await favoriteRepository.findByUserAndVod(
        user.id,
        parseInt(vodId, 10)
      );
      return NextResponse.json({ isFavorite: !!favorite }, { status: 200 });
    }

    // List all favorites
    const favorites = await favoriteRepository.findByUser(user.id);

    return NextResponse.json({ data: favorites }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/favorites
 * Add a VOD to user's favorites
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { vodId, vodName, vodPic, typeName } = body;

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

    // Create favorite (upsert to handle duplicates gracefully)
    const favorite = await favoriteRepository.upsert({
      userId: user.id,
      vodId,
      vodName,
      vodPic: vodPic || '',
      typeName: typeName || '',
    });

    return NextResponse.json({ data: favorite }, { status: 201 });
  } catch (error: unknown) {
    console.error('Add favorite error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}
