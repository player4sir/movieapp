/**
 * Admin types for the Movie Streaming App
 */

import type { MemberLevel } from './auth';

/**
 * Video source category type
 * - normal: 常规影视
 * - adult: 成人影视
 */
export type SourceCategory = 'normal' | 'adult';

/**
 * Quality limit options for streaming
 */
export type QualityLimit = 'sd' | 'hd' | '4k';

/**
 * User group permissions definition
 * These permissions can override individual user settings when assigned to a group
 */
export interface GroupPermissions {
  /** Override member level for users in this group */
  memberLevel?: MemberLevel;
  /** Whether users can watch content */
  canWatch?: boolean;
  /** Whether users can download content */
  canDownload?: boolean;
  /** Maximum number of favorites allowed */
  maxFavorites?: number;
  /** Whether users are ad-free */
  adFree?: boolean;
  /** Maximum concurrent streams allowed */
  maxConcurrentStreams?: number;
  /** Maximum video quality allowed */
  qualityLimit?: QualityLimit;
}

/**
 * User group summary for list views
 */
export interface UserGroupSummary {
  id: string;
  name: string;
  color: string;
}

/**
 * Full user group details
 */
export interface UserGroupDetail {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: GroupPermissions;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

/**
 * Effective permissions after merging user and group settings
 */
export interface EffectivePermissions {
  memberLevel: MemberLevel;
  canWatch: boolean;
  canDownload: boolean;
  maxFavorites: number | null;
  adFree: boolean;
  maxConcurrentStreams: number;
  qualityLimit: QualityLimit;
  /** Indicates whether permissions come from user settings or group */
  source: 'user' | 'group';
}

/**
 * User session information
 */
export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  lastActivityAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
