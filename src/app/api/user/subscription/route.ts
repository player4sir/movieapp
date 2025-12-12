/**
 * User Subscription API
 * GET /api/user/subscription - Get user's subscription status
 * 
 * Returns premium status for ad-free and other premium features
 * 
 * Migrated from Prisma to Drizzle ORM using Repository pattern.
 * Requirements: 3.1, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { UserRepository } from '@/repositories';

// Repository instance
const userRepository = new UserRepository();

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    // Return non-premium for unauthenticated users
    return NextResponse.json({ 
      isPremium: false,
      tier: 'free',
      features: [],
    }, { status: 200 });
  }

  const { user } = authResult;

  try {
    // Get user with subscription info
    const userData = await userRepository.findById(user.id);

    if (!userData) {
      return NextResponse.json({ 
        isPremium: false,
        tier: 'free',
        features: [],
      }, { status: 200 });
    }

    // For now, admin users get premium features
    // In production, check actual subscription status
    const isPremium = userData.role === 'admin';
    
    const features = isPremium 
      ? ['ad_free', 'hd_quality', 'download', 'no_wait']
      : [];

    return NextResponse.json({
      isPremium,
      tier: isPremium ? 'premium' : 'free',
      features,
      // expiresAt: userData.subscriptionExpiry,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
