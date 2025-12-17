/**
 * Ad Statistics Service
 * Handles ad performance statistics calculation and retrieval.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

import {
  AdRepository,
  AdSlotRepository,
  AdImpressionRepository,
  AdClickRepository,
  AdDateRange,
} from '@/repositories';

// Re-export DateRange type for external use
export type DateRange = AdDateRange;


// ============================================
// Types
// ============================================

export interface AdStats {
  adId: string;
  adTitle: string;
  impressions: number;
  clicks: number;
  ctr: number; // clicks / impressions * 100
}

export interface SlotStats {
  slotId: string;
  slotName: string;
  position: string;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  adStats: AdStats[];
}

export interface AllAdsStatsResult {
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  ads: AdStats[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate CTR (Click-Through Rate).
 * Returns 0 if impressions is 0 to avoid division by zero.
 * 
 * Requirements: 5.1
 */
export function calculateCtr(impressions: number, clicks: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

// ============================================
// Repository Instances
// ============================================

const adRepository = new AdRepository();
const adSlotRepository = new AdSlotRepository();
const adImpressionRepository = new AdImpressionRepository();
const adClickRepository = new AdClickRepository();

// ============================================
// Statistics Functions
// Requirements: 5.1, 5.2, 5.3
// ============================================

/**
 * Get statistics for a single ad.
 * 
 * Requirements: 5.1, 5.2
 */
export async function getAdStats(
  adId: string,
  dateRange?: AdDateRange
): Promise<AdStats | null> {
  const ad = await adRepository.findById(adId);
  if (!ad) {
    return null;
  }

  const impressions = await adImpressionRepository.countByAd(adId, dateRange);
  const clicks = await adClickRepository.countByAd(adId, dateRange);
  const ctr = calculateCtr(impressions, clicks);

  return {
    adId: ad.id,
    adTitle: ad.title,
    impressions,
    clicks,
    ctr,
  };
}

/**
 * Get statistics for a slot with aggregation of all ads.
 * 
 * Requirements: 5.3
 */
export async function getSlotStats(
  slotId: string,
  dateRange?: AdDateRange
): Promise<SlotStats | null> {
  const slot = await adSlotRepository.findById(slotId);
  if (!slot) {
    return null;
  }

  // Get total impressions and clicks for the slot
  const totalImpressions = await adImpressionRepository.countBySlot(slotId, dateRange);
  const totalClicks = await adClickRepository.countBySlot(slotId, dateRange);
  const averageCtr = calculateCtr(totalImpressions, totalClicks);

  // Get per-ad statistics for this slot
  // We need to get all ads that have impressions in this slot
  const impressionCounts = await adImpressionRepository.getCountsByAd(dateRange);
  const clickCounts = await adClickRepository.getCountsByAd(dateRange);

  // Create a map of click counts by ad ID
  const clickCountMap = new Map<string, number>();
  for (const cc of clickCounts) {
    clickCountMap.set(cc.adId, cc.count);
  }

  // Build ad stats for ads with impressions
  const adStats: AdStats[] = [];
  const processedAdIds = new Set<string>();

  for (const ic of impressionCounts) {
    if (processedAdIds.has(ic.adId)) continue;
    processedAdIds.add(ic.adId);

    const ad = await adRepository.findById(ic.adId);
    if (!ad) continue;

    // Get slot-specific counts for this ad
    const adImpressions = await adImpressionRepository.countByAd(ic.adId, dateRange);
    const adClicks = clickCountMap.get(ic.adId) ?? 0;
    const adCtr = calculateCtr(adImpressions, adClicks);

    adStats.push({
      adId: ad.id,
      adTitle: ad.title,
      impressions: adImpressions,
      clicks: adClicks,
      ctr: adCtr,
    });
  }

  // Sort by impressions descending
  adStats.sort((a, b) => b.impressions - a.impressions);

  return {
    slotId: slot.id,
    slotName: slot.name,
    position: slot.position,
    totalImpressions,
    totalClicks,
    averageCtr,
    adStats,
  };
}

/**
 * Get statistics for all ads.
 * 
 * Requirements: 5.1, 5.2
 */
export async function getAllAdsStats(
  dateRange?: AdDateRange
): Promise<AllAdsStatsResult> {
  // Get all non-deleted ads
  const ads = await adRepository.findAll({ deleted: false });

  // Get impression and click counts grouped by ad
  const impressionCounts = await adImpressionRepository.getCountsByAd(dateRange);
  const clickCounts = await adClickRepository.getCountsByAd(dateRange);

  // Create maps for quick lookup
  const impressionMap = new Map<string, number>();
  for (const ic of impressionCounts) {
    impressionMap.set(ic.adId, ic.count);
  }

  const clickMap = new Map<string, number>();
  for (const cc of clickCounts) {
    clickMap.set(cc.adId, cc.count);
  }

  // Build stats for each ad
  let totalImpressions = 0;
  let totalClicks = 0;
  const adStats: AdStats[] = [];

  for (const ad of ads) {
    const impressions = impressionMap.get(ad.id) ?? 0;
    const clicks = clickMap.get(ad.id) ?? 0;
    const ctr = calculateCtr(impressions, clicks);

    totalImpressions += impressions;
    totalClicks += clicks;

    adStats.push({
      adId: ad.id,
      adTitle: ad.title,
      impressions,
      clicks,
      ctr,
    });
  }

  // Sort by impressions descending
  adStats.sort((a, b) => b.impressions - a.impressions);

  const averageCtr = calculateCtr(totalImpressions, totalClicks);

  return {
    totalImpressions,
    totalClicks,
    averageCtr,
    ads: adStats,
  };
}

/**
 * Get statistics for all slots.
 * 
 * Requirements: 5.3
 */
export async function getAllSlotsStats(
  dateRange?: AdDateRange
): Promise<SlotStats[]> {
  const slots = await adSlotRepository.findAll();

  const results: SlotStats[] = [];

  for (const slot of slots) {
    const stats = await getSlotStats(slot.id, dateRange);
    if (stats) {
      results.push(stats);
    }
  }

  // Sort by total impressions descending
  results.sort((a, b) => b.totalImpressions - a.totalImpressions);

  return results;
}

// ============================================
// Daily Trend Statistics
// ============================================

export interface DailyStats {
  date: string; // YYYY-MM-DD format
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface TrendStatsResult {
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  dailyStats: DailyStats[];
}

/**
 * Get daily aggregated statistics for a date range.
 * Useful for trend charts and performance analysis.
 * 
 * @param days - Number of days to look back (default: 7)
 */
export async function getDailyStats(days: number = 7): Promise<TrendStatsResult> {
  const dailyStats: DailyStats[] = [];
  let totalImpressions = 0;
  let totalClicks = 0;

  // Generate date range for each day
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dateRange: AdDateRange = {
      startDate: date,
      endDate: nextDate,
    };

    const impressions = await adImpressionRepository.countByDateRange(dateRange);
    const clicks = await adClickRepository.countByDateRange(dateRange);
    const ctr = calculateCtr(impressions, clicks);

    totalImpressions += impressions;
    totalClicks += clicks;

    dailyStats.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      impressions,
      clicks,
      ctr,
    });
  }

  return {
    totalImpressions,
    totalClicks,
    averageCtr: calculateCtr(totalImpressions, totalClicks),
    dailyStats,
  };
}
