/**
 * Check-in Service
 * Handles daily check-in operations with streak calculation and bonus rewards.
 * 
 * Requirements: 2.1, 2.2, 2.4
 */

import {
  CheckinRepository,
  CoinConfigRepository,
} from '@/repositories';
import { addCoins } from './coin.service';
import { UserCheckin } from '@/db/schema';

// ============================================
// Error Definitions
// ============================================

export const CHECKIN_ERRORS = {
  ALREADY_CHECKED_IN: {
    code: 'ALREADY_CHECKED_IN',
    message: '今日已签到',
  },
  CHECKIN_FAILED: {
    code: 'CHECKIN_FAILED',
    message: '签到失败',
  },
} as const;

// ============================================
// Types
// ============================================

export interface CheckinResult {
  success: boolean;
  coinsEarned: number;
  streakCount: number;
  nextCheckinTime: Date;
  bonusApplied: number;
}

export interface CheckinStatus {
  canCheckin: boolean;
  lastCheckinDate: Date | null;
  streakCount: number;
  nextCheckinTime: Date;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG = {
  checkin_base_reward: 10,
  checkin_streak_bonus: [0, 5, 10, 15, 20, 30, 50], // Bonus for days 1-7
  checkin_streak_max: 7,
};

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get the start of today (midnight).
 */
function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the start of tomorrow (next midnight).
 */
function getStartOfTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Check if a date is yesterday.
 */
function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate.getTime() === yesterday.getTime();
}

/**
 * Check if a date is today.
 */
function isToday(date: Date): boolean {
  const today = getStartOfToday();
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate.getTime() === today.getTime();
}

// ============================================
// CheckinService Implementation
// ============================================

const checkinRepository = new CheckinRepository();
const configRepository = new CoinConfigRepository();

/**
 * Get configuration value with fallback to default.
 */
async function getConfigValue<T>(key: string, defaultValue: T): Promise<T> {
  const config = await configRepository.getByKey(key);
  if (config && config.value !== null) {
    return config.value as T;
  }
  return defaultValue;
}

/**
 * Calculate bonus coins based on streak count.
 * 
 * Requirements: 2.4
 */
async function calculateBonus(streakCount: number): Promise<number> {
  const bonusArray = await getConfigValue<number[]>(
    'checkin_streak_bonus',
    DEFAULT_CONFIG.checkin_streak_bonus
  );
  const maxStreak = await getConfigValue<number>(
    'checkin_streak_max',
    DEFAULT_CONFIG.checkin_streak_max
  );
  
  // Streak count is 1-indexed, array is 0-indexed
  const index = Math.min(streakCount - 1, maxStreak - 1);
  return bonusArray[index] ?? 0;
}

/**
 * Calculate the new streak count based on last check-in.
 */
async function calculateNewStreakCount(lastCheckin: UserCheckin | null): Promise<number> {
  const maxStreak = await getConfigValue<number>(
    'checkin_streak_max',
    DEFAULT_CONFIG.checkin_streak_max
  );

  if (!lastCheckin) {
    return 1; // First check-in
  }

  const lastCheckinDate = new Date(lastCheckin.checkinDate);

  // If last check-in was yesterday, continue streak
  if (isYesterday(lastCheckinDate)) {
    const newStreak = lastCheckin.streakCount + 1;
    // Reset to 1 if exceeds max streak
    return newStreak > maxStreak ? 1 : newStreak;
  }

  // Streak is broken, start fresh
  return 1;
}

/**
 * Perform daily check-in for a user.
 * 
 * Requirements: 2.1, 2.2, 2.4
 */
export async function checkin(userId: string): Promise<CheckinResult> {
  const today = getStartOfToday();
  
  // Check if already checked in today
  const existingCheckin = await checkinRepository.findByUserAndDate(userId, today);
  if (existingCheckin) {
    throw { ...CHECKIN_ERRORS.ALREADY_CHECKED_IN };
  }

  // Get last check-in to calculate streak
  const lastCheckin = await checkinRepository.getLastCheckin(userId);
  
  // Calculate new streak count
  const newStreakCount = await calculateNewStreakCount(lastCheckin);
  
  // Get base reward and calculate bonus
  const baseReward = await getConfigValue<number>(
    'checkin_base_reward',
    DEFAULT_CONFIG.checkin_base_reward
  );
  const bonus = await calculateBonus(newStreakCount);
  const totalCoins = baseReward + bonus;

  // Add coins to user balance
  await addCoins(
    userId,
    totalCoins,
    'checkin',
    `签到第${newStreakCount}天，获得${totalCoins}金币`,
    { streakCount: newStreakCount, baseReward, bonus }
  );

  // Create check-in record
  await checkinRepository.create({
    id: generateId(),
    userId,
    checkinDate: today,
    streakCount: newStreakCount,
    coinsEarned: totalCoins,
  });

  return {
    success: true,
    coinsEarned: totalCoins,
    streakCount: newStreakCount,
    nextCheckinTime: getStartOfTomorrow(),
    bonusApplied: bonus,
  };
}


/**
 * Get the current check-in status for a user.
 * 
 * Requirements: 2.2
 */
export async function getCheckinStatus(userId: string): Promise<CheckinStatus> {
  const today = getStartOfToday();
  
  // Check if already checked in today
  const todayCheckin = await checkinRepository.findByUserAndDate(userId, today);
  
  // Get last check-in
  const lastCheckin = await checkinRepository.getLastCheckin(userId);
  
  // Calculate current streak
  let streakCount = 0;
  if (lastCheckin) {
    const lastCheckinDate = new Date(lastCheckin.checkinDate);
    if (isToday(lastCheckinDate)) {
      streakCount = lastCheckin.streakCount;
    } else if (isYesterday(lastCheckinDate)) {
      streakCount = lastCheckin.streakCount;
    }
    // Otherwise streak is broken, stays at 0
  }

  return {
    canCheckin: !todayCheckin,
    lastCheckinDate: lastCheckin?.checkinDate ?? null,
    streakCount,
    nextCheckinTime: todayCheckin ? getStartOfTomorrow() : today,
  };
}

/**
 * Get the current streak count for a user.
 */
export async function getStreakCount(userId: string): Promise<number> {
  return await checkinRepository.getStreakCount(userId);
}

/**
 * Get check-in history for a user within a date range.
 */
export async function getCheckinHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UserCheckin[]> {
  return await checkinRepository.getHistory(userId, startDate, endDate);
}
