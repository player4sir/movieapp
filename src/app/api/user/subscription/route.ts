/**
 * User Subscription API
 * GET /api/user/subscription - Get user's subscription status
 * 
 * Returns membership status including VIP/SVIP tier and features
 * - VIP: Can access normal content for free
 * - SVIP: Can access all content (normal + adult) for free
 * 
 * Now considers user group permissions for membership level override.
 * Requirements: 3.1, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { UserRepository, UserGroupRepository } from '@/repositories';
import { calculateEffectivePermissions, parseGroupPermissions, isMembershipExpired } from '@/services/permission.service';

// Repository instances
const userRepository = new UserRepository();
const groupRepository = new UserGroupRepository();

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

    // Fetch group permissions if user belongs to a group
    let groupPermissions = null;
    if (userData.groupId) {
      const group = await groupRepository.findById(userData.groupId);
      if (group) {
        groupPermissions = parseGroupPermissions(group.permissions);
      }
    }

    // Calculate effective permissions considering group overrides
    const effectivePerms = calculateEffectivePermissions(
      { memberLevel: userData.memberLevel, memberExpiry: userData.memberExpiry },
      groupPermissions
    );

    // Determine if membership is active:
    // - Group-granted memberships are always active (no expiry)
    // - User's own membership requires valid expiry
    const hasGroupMembershipOverride = !!groupPermissions?.memberLevel;
    const isUserMembershipActive = !isMembershipExpired(userData.memberExpiry);
    const isEffectiveMembershipActive = hasGroupMembershipOverride || isUserMembershipActive;

    // Determine tier based on effective memberLevel and active status
    const effectiveMemberLevel = effectivePerms.memberLevel;
    const isSvip = isEffectiveMembershipActive && effectiveMemberLevel === 'svip';
    const isVip = isEffectiveMembershipActive && (effectiveMemberLevel === 'vip' || effectiveMemberLevel === 'svip');

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

    // Features based on tier and effective permissions
    const features: string[] = [];
    if (isPremium || effectivePerms.adFree) {
      features.push('ad_free');
    }
    if (isPremium) {
      features.push('hd_quality', 'no_wait');
    }
    if (isSvip || isAdmin) {
      features.push('adult_access');
    }
    if (effectivePerms.canDownload) {
      features.push('download');
    }

    return NextResponse.json({
      isPremium,
      isVip,
      isSvip,
      tier,
      features,
      memberLevel: effectiveMemberLevel,
      // Return user's own expiry (null for group-granted membership)
      expiresAt: hasGroupMembershipOverride ? null : userData.memberExpiry,
      // Additional info about permissions source
      permissionSource: effectivePerms.source,
      effectivePermissions: {
        adFree: effectivePerms.adFree,
        canDownload: effectivePerms.canDownload,
        maxFavorites: effectivePerms.maxFavorites,
        qualityLimit: effectivePerms.qualityLimit,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

