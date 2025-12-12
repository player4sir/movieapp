/**
 * Access Service
 * Handles content access record management and statistics.
 * 
 * Requirements: 5.2, 7.1, 8.1
 */

import {
  ContentAccessRepository,
  ContentAccessFilterParams,
  ContentAccessListResult,
} from '@/repositories';
import { ContentAccess, SourceCategory } from '@/db/schema';

// ============================================
// Types
// ============================================

export interface CreateAccessRecordInput {
  userId: string;
  vodId: number;
  episodeIndex: number;
  sourceCategory: SourceCategory;
  unlockType: 'purchase' | 'vip';
  coinsSpent: number;
}

export interface UnlockStatsParams {
  startDate?: Date;
  endDate?: Date;
}

export interface UnlockStats {
  totalUnlocks: number;
  totalRevenue: number;
  dailyStats: AccessDailyStat[];
  categoryBreakdown: CategoryStat[];
  topContent: TopContent[];
}

export interface AccessDailyStat {
  date: string;
  unlockCount: number;
  revenue: number;
  normalCount: number;
  adultCount: number;
}

export interface CategoryStat {
  category: SourceCategory;
  count: number;
  revenue: number;
}

export interface TopContent {
  vodId: number;
  unlockCount: number;
  totalRevenue: number;
}

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// AccessService Implementation
// ============================================

const contentAccessRepository = new ContentAccessRepository();

/**
 * Check if user has access to specific content/episode.
 * 
 * Requirements: 5.2
 */
export async function hasAccess(
  userId: string,
  vodId: number,
  episodeIndex: number
): Promise<boolean> {
  const record = await contentAccessRepository.findByUserAndContent(
    userId,
    vodId,
    episodeIndex
  );
  return record !== null;
}

/**
 * Create a new access record.
 * Used when unlocking content via VIP or purchase.
 * 
 * Requirements: 5.1
 */
export async function createAccessRecord(
  input: CreateAccessRecordInput
): Promise<ContentAccess> {
  return await contentAccessRepository.create({
    id: generateId(),
    userId: input.userId,
    vodId: input.vodId,
    episodeIndex: input.episodeIndex,
    sourceCategory: input.sourceCategory,
    unlockType: input.unlockType,
    coinsSpent: input.coinsSpent,
  });
}

/**
 * Get user's unlocked content with pagination and filtering.
 * 
 * Requirements: 7.1
 */
export async function getUserUnlocks(
  userId: string,
  params: {
    sourceCategory?: SourceCategory;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<ContentAccessListResult> {
  const filterParams: ContentAccessFilterParams = {
    userId,
    sourceCategory: params.sourceCategory,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };

  return await contentAccessRepository.findByUser(filterParams);
}

/**
 * Get all unlocked episodes for a specific VOD.
 * Useful for showing which episodes are unlocked on detail page.
 */
export async function getUnlockedEpisodes(
  userId: string,
  vodId: number
): Promise<ContentAccess[]> {
  return await contentAccessRepository.findByUserAndVod(userId, vodId);
}

/**
 * Get unlock statistics for admin dashboard.
 * 
 * Requirements: 8.1
 */
export async function getUnlockStats(
  params: UnlockStatsParams = {}
): Promise<UnlockStats> {
  const { startDate, endDate } = params;

  // Get basic stats
  const basicStats = await contentAccessRepository.getStats(startDate, endDate);

  // Get daily stats if date range provided
  let dailyStats: AccessDailyStat[] = [];
  if (startDate && endDate) {
    dailyStats = await contentAccessRepository.getDailyStats(startDate, endDate);
  }

  // Get top content
  const topContent = await contentAccessRepository.getTopContent(10, startDate, endDate);

  // Build category breakdown
  const categoryBreakdown: CategoryStat[] = [
    {
      category: 'normal',
      count: basicStats.byCategory.normal.count,
      revenue: basicStats.byCategory.normal.revenue,
    },
    {
      category: 'adult',
      count: basicStats.byCategory.adult.count,
      revenue: basicStats.byCategory.adult.revenue,
    },
  ];

  return {
    totalUnlocks: basicStats.totalUnlocks,
    totalRevenue: basicStats.totalRevenue,
    dailyStats,
    categoryBreakdown,
    topContent,
  };
}
