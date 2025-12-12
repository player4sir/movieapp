'use client';

/**
 * Coins Context
 * Provides shared coin state across all components
 * Fixes the issue where CoinBalance doesn't update after check-in
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Types
export interface CoinBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
}

export interface CheckinStatus {
  canCheckin: boolean;
  lastCheckinDate: string | null;
  streakCount: number;
  nextCheckinTime: string;
}

export interface CheckinResult {
  success: boolean;
  coinsEarned: number;
  streakCount: number;
  nextCheckinTime: string;
  bonusApplied: number;
}

export type TransactionType = 'recharge' | 'checkin' | 'exchange' | 'consume' | 'adjust';

export interface CoinTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface TransactionPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

interface CoinsContextValue {
  // Balance state
  balance: CoinBalance | null;
  balanceLoading: boolean;
  balanceError: string | null;
  refreshBalance: () => Promise<void>;
  
  // Check-in state
  checkinStatus: CheckinStatus | null;
  checkinLoading: boolean;
  checkinError: string | null;
  performCheckin: () => Promise<CheckinResult | null>;
  refreshCheckinStatus: () => Promise<void>;
  
  // Transactions state
  transactions: CoinTransaction[];
  transactionsPagination: TransactionPagination | null;
  transactionsLoading: boolean;
  transactionsError: string | null;
  fetchTransactions: (page?: number, filters?: TransactionFilters) => Promise<void>;
}

const CoinsContext = createContext<CoinsContextValue | null>(null);

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  
  // Balance state
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  
  // Check-in state
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  
  // Transactions state
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [transactionsPagination, setTransactionsPagination] = useState<TransactionPagination | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setBalance(null);
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);

    try {
      const response = await fetch('/api/user/coins', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '获取金币余额失败');
      }

      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : '获取金币余额失败');
    } finally {
      setBalanceLoading(false);
    }
  }, [getAccessToken]);

  const refreshCheckinStatus = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setCheckinStatus(null);
      return;
    }

    try {
      const response = await fetch('/api/user/coins/checkin', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '获取签到状态失败');
      }

      const data = await response.json();
      setCheckinStatus(data);
    } catch (err) {
      console.error('Failed to fetch checkin status:', err);
    }
  }, [getAccessToken]);

  const performCheckin = useCallback(async (): Promise<CheckinResult | null> => {
    const token = getAccessToken();
    if (!token) return null;

    setCheckinLoading(true);
    setCheckinError(null);

    try {
      const response = await fetch('/api/user/coins/checkin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.nextCheckinTime) {
          setCheckinStatus(prev => prev ? {
            ...prev,
            canCheckin: false,
            nextCheckinTime: data.nextCheckinTime,
            streakCount: data.streakCount ?? prev.streakCount,
          } : null);
        }
        throw new Error(data.message || '签到失败');
      }

      // Update check-in status
      setCheckinStatus({
        canCheckin: false,
        lastCheckinDate: new Date().toISOString().split('T')[0],
        streakCount: data.streakCount,
        nextCheckinTime: data.nextCheckinTime,
      });

      // Refresh balance - this now updates the shared state
      await refreshBalance();

      return data as CheckinResult;
    } catch (err) {
      setCheckinError(err instanceof Error ? err.message : '签到失败');
      return null;
    } finally {
      setCheckinLoading(false);
    }
  }, [getAccessToken, refreshBalance]);

  const fetchTransactions = useCallback(async (
    page: number = 1,
    filters: TransactionFilters = {}
  ) => {
    const token = getAccessToken();
    if (!token) {
      setTransactions([]);
      setTransactionsPagination(null);
      return;
    }

    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      
      if (filters.type) params.set('type', filters.type);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const response = await fetch(`/api/user/coins/transactions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '获取交易记录失败');
      }

      const data = await response.json();
      setTransactions(data.data);
      setTransactionsPagination(data.pagination);
    } catch (err) {
      setTransactionsError(err instanceof Error ? err.message : '获取交易记录失败');
    } finally {
      setTransactionsLoading(false);
    }
  }, [getAccessToken]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance();
      refreshCheckinStatus();
    } else {
      setBalance(null);
      setCheckinStatus(null);
      setTransactions([]);
      setTransactionsPagination(null);
      setBalanceLoading(false);
    }
  }, [isAuthenticated, refreshBalance, refreshCheckinStatus]);

  return (
    <CoinsContext.Provider value={{
      balance,
      balanceLoading,
      balanceError,
      refreshBalance,
      checkinStatus,
      checkinLoading,
      checkinError,
      performCheckin,
      refreshCheckinStatus,
      transactions,
      transactionsPagination,
      transactionsLoading,
      transactionsError,
      fetchTransactions,
    }}>
      {children}
    </CoinsContext.Provider>
  );
}

export function useCoinsContext() {
  const context = useContext(CoinsContext);
  if (!context) {
    throw new Error('useCoinsContext must be used within a CoinsProvider');
  }
  return context;
}
