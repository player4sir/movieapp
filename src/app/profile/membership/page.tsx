'use client';

/**
 * Membership Order History Page
 * Displays user's membership order history
 * 
 * Requirements: 9.1 - Display orders with status, plan details, and timestamps
 * Requirements: 9.3 - Display membership activation details for approved orders
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { BottomNav } from '@/components/layout/BottomNav';
import { OrderHistory } from '@/components/membership';
import { Sidebar } from '@/components/layout/Sidebar';

export default function MembershipOrdersPage() {
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
    <>
      <Sidebar />

      <div className="h-screen flex flex-col bg-background overflow-hidden lg:pl-64">
        {/* Header - Responsive */}
        <header className="fixed top-0 left-0 lg:left-64 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-surface-secondary">
          <div className="flex items-center h-14 px-4 pt-safe-top">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-surface active:bg-surface-secondary"
              aria-label="返回"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold">会员订单</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto pt-14 pb-4 bg-surface dark:bg-background">
          <div className="max-w-screen-md mx-auto min-h-full p-4">
            <OrderHistory />
          </div>
        </main>

        <BottomNav />
      </div>
    </>
  );
}
