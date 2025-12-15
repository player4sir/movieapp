/**
 * Permission Service
 * 
 * Handles permission calculation and merging logic for users and groups.
 * Group permissions override individual user settings when defined.
 * 
 * @module services/permission.service
 */

import type { MemberLevel } from '../types/auth';
import type { GroupPermissions, EffectivePermissions } from '../types/admin';

/**
 * User data required for permission calculation
 */
export interface UserPermissionData {
  memberLevel: MemberLevel;
  memberExpiry?: Date | null;
}

/**
 * Default permission values for users without group assignment
 */
const DEFAULT_PERMISSIONS: Omit<EffectivePermissions, 'source'> = {
  memberLevel: 'free',
  canWatch: true,
  canDownload: false,
  maxFavorites: 100,
  adFree: false,
  maxConcurrentStreams: 1,
  qualityLimit: 'hd',
};

/**
 * Permission defaults based on member level
 */
const MEMBER_LEVEL_DEFAULTS: Record<MemberLevel, Partial<Omit<EffectivePermissions, 'source' | 'memberLevel'>>> = {
  free: {
    canWatch: true,
    canDownload: false,
    maxFavorites: 50,
    adFree: false,
    maxConcurrentStreams: 1,
    qualityLimit: 'sd',
  },
  vip: {
    canWatch: true,
    canDownload: true,
    maxFavorites: 200,
    adFree: false,
    maxConcurrentStreams: 2,
    qualityLimit: 'hd',
  },
  svip: {
    canWatch: true,
    canDownload: true,
    maxFavorites: null, // unlimited
    adFree: true,
    maxConcurrentStreams: 4,
    qualityLimit: '4k',
  },
};

/**
 * Calculates effective permissions for a user by merging their individual settings
 * with group permissions. Group permissions override user settings when defined.
 * 
 * @param user - User data containing member level and expiry
 * @param groupPermissions - Optional group permissions to apply
 * @returns Effective permissions with source indicator
 * 
 * @example
 * ```typescript
 * const user = { memberLevel: 'free' };
 * const groupPerms = { memberLevel: 'vip', adFree: true };
 * const effective = calculateEffectivePermissions(user, groupPerms);
 * // effective.memberLevel === 'vip'
 * // effective.source === 'group'
 * ```
 */
export function calculateEffectivePermissions(
  user: UserPermissionData,
  groupPermissions?: GroupPermissions | null
): EffectivePermissions {
  // Start with user's member level
  const userMemberLevel = user.memberLevel;

  // Get base permissions from user's member level
  const basePermissions = MEMBER_LEVEL_DEFAULTS[userMemberLevel];

  // If no group permissions, return user-based permissions
  if (!groupPermissions || Object.keys(groupPermissions).length === 0) {
    return {
      memberLevel: userMemberLevel,
      canWatch: basePermissions.canWatch ?? DEFAULT_PERMISSIONS.canWatch,
      canDownload: basePermissions.canDownload ?? DEFAULT_PERMISSIONS.canDownload,
      maxFavorites: basePermissions.maxFavorites ?? DEFAULT_PERMISSIONS.maxFavorites,
      adFree: basePermissions.adFree ?? DEFAULT_PERMISSIONS.adFree,
      maxConcurrentStreams: basePermissions.maxConcurrentStreams ?? DEFAULT_PERMISSIONS.maxConcurrentStreams,
      qualityLimit: basePermissions.qualityLimit ?? DEFAULT_PERMISSIONS.qualityLimit,
      source: 'user',
    };
  }

  // Determine effective member level (group overrides user if defined)
  const effectiveMemberLevel = groupPermissions.memberLevel ?? userMemberLevel;

  // Get base permissions for the effective member level
  const effectiveBasePermissions = MEMBER_LEVEL_DEFAULTS[effectiveMemberLevel];

  // Merge permissions: group permissions override base permissions when defined
  return {
    memberLevel: effectiveMemberLevel,
    canWatch: groupPermissions.canWatch ?? effectiveBasePermissions.canWatch ?? DEFAULT_PERMISSIONS.canWatch,
    canDownload: groupPermissions.canDownload ?? effectiveBasePermissions.canDownload ?? DEFAULT_PERMISSIONS.canDownload,
    maxFavorites: groupPermissions.maxFavorites !== undefined
      ? groupPermissions.maxFavorites
      : (effectiveBasePermissions.maxFavorites ?? DEFAULT_PERMISSIONS.maxFavorites),
    adFree: groupPermissions.adFree ?? effectiveBasePermissions.adFree ?? DEFAULT_PERMISSIONS.adFree,
    maxConcurrentStreams: groupPermissions.maxConcurrentStreams ?? effectiveBasePermissions.maxConcurrentStreams ?? DEFAULT_PERMISSIONS.maxConcurrentStreams,
    qualityLimit: groupPermissions.qualityLimit ?? effectiveBasePermissions.qualityLimit ?? DEFAULT_PERMISSIONS.qualityLimit,
    source: 'group',
  };
}

/**
 * Checks if a user's membership has expired
 * 
 * @param memberExpiry - The membership expiry date
 * @returns true if membership has expired, false otherwise
 */
export function isMembershipExpired(memberExpiry: Date | null | undefined): boolean {
  if (!memberExpiry) {
    return false; // No expiry means never expires
  }
  return new Date() > new Date(memberExpiry);
}

/**
 * Gets the effective member level considering expiry
 * If membership is expired, returns 'free'
 * 
 * @param memberLevel - The user's member level
 * @param memberExpiry - The membership expiry date
 * @returns The effective member level
 */
export function getEffectiveMemberLevel(
  memberLevel: MemberLevel,
  memberExpiry: Date | null | undefined
): MemberLevel {
  if (memberLevel === 'free') {
    return 'free';
  }

  if (isMembershipExpired(memberExpiry)) {
    return 'free';
  }

  return memberLevel;
}

/**
 * Validates group permissions object
 * 
 * @param permissions - The permissions object to validate
 * @returns true if valid, false otherwise
 */
export function isValidGroupPermissions(permissions: unknown): permissions is GroupPermissions {
  if (!permissions || typeof permissions !== 'object') {
    return true; // Empty/null is valid (no overrides)
  }

  const p = permissions as Record<string, unknown>;

  // Validate memberLevel if present
  if (p.memberLevel !== undefined && !['free', 'vip', 'svip'].includes(p.memberLevel as string)) {
    return false;
  }

  // Validate qualityLimit if present
  if (p.qualityLimit !== undefined && !['sd', 'hd', '4k'].includes(p.qualityLimit as string)) {
    return false;
  }

  // Validate boolean fields
  const booleanFields = ['canWatch', 'canDownload', 'adFree'];
  for (const field of booleanFields) {
    if (p[field] !== undefined && typeof p[field] !== 'boolean') {
      return false;
    }
  }

  // Validate numeric fields
  const numericFields = ['maxFavorites', 'maxConcurrentStreams'];
  for (const field of numericFields) {
    if (p[field] !== undefined && (typeof p[field] !== 'number' || p[field] < 0)) {
      return false;
    }
  }

  return true;
}

/**
 * Parses group permissions from JSON
 * 
 * @param json - The JSON value from database
 * @returns Parsed GroupPermissions or empty object if invalid
 */
export function parseGroupPermissions(json: unknown): GroupPermissions {
  if (!json || typeof json !== 'object') {
    return {};
  }

  if (!isValidGroupPermissions(json)) {
    return {};
  }

  return json as GroupPermissions;
}
