'use client';

/**
 * Coin Transaction History Page
 * Displays user's coin transaction history with filtering
 * 
 * Requirements: 4.1 - Display paginated list of transactions
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { CoinBalance, TransactionHistory } from '@/components/coins';

export default function CoinsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-surface">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link href="/profile" className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold">金币明细</h1>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="px-4 py-4 bg-surface/50">
        <div className="text-sm text-foreground/60 mb-1">当前余额</div>
        <CoinBalance showDetails />
      </div>

      {/* Transaction History */}
      <div className="px-4 py-4">
        <TransactionHistory />
      </div>
    </div>
  );
}
