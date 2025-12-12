/**
 * Membership Service
 * Handles membership plan retrieval, status checking, activation, and admin adjustments.
 * 
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 5.1, 5.2, 8.1, 8.2, 8.3
 */

import {
  MembershipPlanRepository,
  MembershipAdjustLogRepository,
  UserRepository,
} from '@/repositories';
import { MembershipPlan, User, MemberLevel } from '@/db/schema';
import { getEffectiveMemberLevel } from './permission.service';

// ============================================
// Error Definitions
// ============================================

export const MEMBERSHIP_ERRORS = {
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: '用户不存在',
  },
  PLAN_NOT_FOUND: {
    code: 'PLAN_NOT_FOUND',
    message: '会员套餐不存在',
  },
  PLAN_DISABLED: {
    code: 'PLAN_DISABLED',
    message: '该套餐已下架',
  },
  INVALID_DURATION: {
    code: 'INVALID_DURATION',
    message: '无效的会员时长',
  },
  INVALID_LEVEL: {
    code: 'INVALID_LEVEL',
    message: '无效的会员等级',
  },
} as const;

// ============================================
// Types
// ============================================

export interface MembershipStatus {
  userId: string;
  memberLevel: MemberLevel;
  memberExpiry: Date | null;
  isActive: boolean;
  daysRemaining: number;
}

export interface ActivateMembershipResult {
  user: User;
  previousLevel: MemberLevel;
  previousExpiry: Date | null;
  newLevel: MemberLevel;
  newExpiry: Date;
}

export interface AdjustMembershipResult {
  user: User;
  previousLevel: MemberLevel;
  previousExpiry: Date | null;
  newLevel: MemberLevel;
  newExpiry: Date | null;
}

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate the new expiry date based on current membership status.
 * 
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2
 * 
 * Rules:
 * - If user is free or membership is expired: new expiry = current time + duration days
 * - If user has active membership: new expiry = existing expiry + duration days
 * - If upgrading from VIP to SVIP: duration is added to existing expiry
 */
export function calculateNewExpiry(
  currentLevel: MemberLevel,
  currentExpiry: Date | null,
  newLevel: MemberLevel,
  durationDays: number
): Date {
  const now = new Date();

  // Determine if user has active membership
  const isActive = currentLevel !== 'free' && currentExpiry && currentExpiry >= now;

  let baseDate: Date;

  if (isActive && currentExpiry) {
    // User has active membership - add duration to existing expiry
    baseDate = new Date(currentExpiry);
  } else {
    // User is free or membership expired - start from now
    baseDate = now;
  }

  // Add duration days
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + durationDays);

  return newExpiry;
}

/**
 * Calculate days remaining until expiry.
 */
function calculateDaysRemaining(expiry: Date | null): number {
  if (!expiry) return 0;

  const now = new Date();
  if (expiry < now) return 0;

  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================
// MembershipService Implementation
// ============================================

const membershipPlanRepository = new MembershipPlanRepository();
const membershipAdjustLogRepository = new MembershipAdjustLogRepository();
const userRepository = new UserRepository();

/**
 * Get all enabled membership plans.
 * 
 * Requirements: 1.1
 */
export async function getPlans(): Promise<MembershipPlan[]> {
  return membershipPlanRepository.findEnabled();
}

/**
 * Get a specific plan by ID.
 */
export async function getPlanById(planId: string): Promise<MembershipPlan | null> {
  return membershipPlanRepository.findById(planId);
}

/**
 * Get user's current membership status with expiry logic.
 * Returns 'free' if membership has expired.
 * 
 * Requirements: 1.2, 1.3
 */
export async function getMembershipStatus(userId: string): Promise<MembershipStatus> {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw { ...MEMBERSHIP_ERRORS.USER_NOT_FOUND };
  }

  const effectiveLevel = getEffectiveMemberLevel(user.memberLevel, user.memberExpiry);
  const isActive = effectiveLevel !== 'free';
  const daysRemaining = calculateDaysRemaining(user.memberExpiry);

  return {
    userId: user.id,
    memberLevel: effectiveLevel,
    memberExpiry: user.memberExpiry,
    isActive,
    daysRemaining,
  };
}

/**
 * Activate membership for a user.
 * Handles duration stacking for renewals and upgrades.
 * Supports optional transaction context for atomic operations.
 * 
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2
 * 
 * Rules:
 * - If user is free or membership is expired: new expiry = current time + duration days
 * - If user has active membership: new expiry = existing expiry + duration days
 * - If upgrading from VIP to SVIP: memberLevel changes to 'svip' and duration is added to existing expiry
 */
export async function activateMembership(
  userId: string,
  level: MemberLevel,
  durationDays: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbContext?: any
): Promise<ActivateMembershipResult> {
  if (durationDays <= 0) {
    throw { ...MEMBERSHIP_ERRORS.INVALID_DURATION };
  }

  if (level === 'free') {
    throw { ...MEMBERSHIP_ERRORS.INVALID_LEVEL };
  }

  // Use provided transaction context or default repository
  const repo = dbContext ? new UserRepository(dbContext) : userRepository;

  const user = await repo.findById(userId);

  if (!user) {
    throw { ...MEMBERSHIP_ERRORS.USER_NOT_FOUND };
  }

  const previousLevel = user.memberLevel;
  const previousExpiry = user.memberExpiry;

  // Calculate new expiry based on current status
  const newExpiry = calculateNewExpiry(
    previousLevel,
    previousExpiry,
    level,
    durationDays
  );

  // Update user's membership
  const updatedUser = await repo.update(userId, {
    memberLevel: level,
    memberExpiry: newExpiry,
  });

  if (!updatedUser) {
    throw { ...MEMBERSHIP_ERRORS.USER_NOT_FOUND };
  }

  return {
    user: updatedUser,
    previousLevel,
    previousExpiry,
    newLevel: level,
    newExpiry,
  };
}

/**
 * Admin: Manually adjust user membership status.
 * Creates an audit log record.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export async function adjustMembership(
  userId: string,
  adminId: string,
  level: MemberLevel,
  expiry: Date | null,
  reason: string
): Promise<AdjustMembershipResult> {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw { ...MEMBERSHIP_ERRORS.USER_NOT_FOUND };
  }

  const previousLevel = user.memberLevel;
  const previousExpiry = user.memberExpiry;

  // Update user's membership
  const updatedUser = await userRepository.update(userId, {
    memberLevel: level,
    memberExpiry: expiry,
  });

  if (!updatedUser) {
    throw { ...MEMBERSHIP_ERRORS.USER_NOT_FOUND };
  }

  // Create audit log
  await membershipAdjustLogRepository.create({
    id: generateId(),
    userId,
    adminId,
    previousLevel,
    newLevel: level,
    previousExpiry,
    newExpiry: expiry,
    reason,
  });

  return {
    user: updatedUser,
    previousLevel,
    previousExpiry,
    newLevel: level,
    newExpiry: expiry,
  };
}
