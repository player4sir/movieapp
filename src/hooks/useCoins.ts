'use client';

/**
 * Coins Hook
 * Now uses CoinsContext for shared state across components
 * This ensures balance updates are reflected everywhere after check-in
 * 
 * Requirements: 1.1, 1.2, 2.1, 4.1
 */

import { useCoinsContext } from '@/contexts/CoinsContext';

// Re-export types from context
export type {
  CoinBalance,
  CheckinStatus,
  CheckinResult,
  TransactionType,
  CoinTransaction,
  TransactionPagination,
  TransactionFilters,
} from '@/contexts/CoinsContext';

/**
 * Hook to access coin-related state and actions
 * Uses shared context so all components stay in sync
 */
export function useCoins() {
  return useCoinsContext();
}
