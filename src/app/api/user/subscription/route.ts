/**
 * User Subscription API
 * GET /api/user/subscription - Get user's subscription status
 * 
 * Returns membership status including VIP/SVIP tier and features
 * - VIP: Can access normal content for free
 * - SVIP: Can access all content (normal + adult) for free
 * 
 * Migrated from Prisma to Drizzle ORM using Repository pattern.
 * Requirements: 3.1, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { UserRepository } from '@/repositories';

// Repository instance
const userRepository = new UserRepository();

/**
 * Check if membership is still active
 */
function isMembershipActive(memberExpiry: Date | null): boolean {
  if (!memberExpiry) return false;
  return new Date(memberExpiry) > new Date();
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    // Return non-premium for unauthenticated users
    return NextResponse.json({
      isPremium: false,
      isVip: false,
      isSvip: false,
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
        isVip: false,
        isSvip: false,
        tier: 'free',
        features: [],
      }, { status: 200 });
    }

    // Check membership status
    const isActive = isMembershipActive(userData.memberExpiry);
    const memberLevel = userData.memberLevel || 'free';

    // Determine tier based on memberLevel and active status
    // VIP: can access normal content for free
    // SVIP: can access all content (normal + adult) for free
    const isSvip = isActive && memberLevel === 'svip';
    const isVip = isActive && (memberLevel === 'vip' || memberLevel === 'svip');

    // Admin users also get premium features
    const isAdmin = userData.role === 'admin';
    const isPremium = isVip || isSvip || isAdmin;

    // Determine tier string
    let tier = 'free';
    if (isSvip) {
      tier = 'svip';
    } else if (isVip) {
      tier = 'vip';
    } else if (isAdmin) {
      tier = 'admin';
    }

    // Features based on tier
    const features: string[] = [];
    if (isPremium) {
      features.push('ad_free', 'hd_quality', 'no_wait');
    }
    if (isSvip || isAdmin) {
      features.push('adult_access');
    }

    return NextResponse.json({
      isPremium,
      isVip,
      isSvip,
      tier,
      features,
      memberLevel,
      expiresAt: userData.memberExpiry,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
