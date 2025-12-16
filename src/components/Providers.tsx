'use client';

import { ReactNode, useEffect, Suspense, useMemo } from 'react';
import { SWRConfig } from 'swr';
import { AuthProvider } from '@/contexts/AuthContext';
import { CoinsProvider } from '@/contexts/CoinsContext';
import { SplashAdWrapper } from '@/components/ads';
import { setupGlobalFetchInterceptor } from '@/lib/api-client';
import { ReferralTracker } from '@/components/referral/ReferralTracker';
import { SiteTitle } from '@/components/layout';

// Global fetcher for SWR - defined inline to avoid circular dependencies
const globalFetcher = async (url: string) => {
  const res = await fetch(url);
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const error = await res.json();
      throw new Error(error.message || `Request failed (${res.status})`);
    }
    throw new Error(`Request failed (${res.status})`);
  }

  if (!isJson) {
    throw new Error('Invalid response format: expected JSON');
  }

  return res.json();
};

export function Providers({ children }: { children: ReactNode }) {
  // Install global fetch interceptor for automatic 401 handling
  useEffect(() => {
    setupGlobalFetchInterceptor();
  }, []);

  // SWR config - memoized to prevent unnecessary re-renders
  const swrValue = useMemo(() => ({
    fetcher: globalFetcher,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: true,
  }), []);

  return (
    <SWRConfig value={swrValue}>
      <AuthProvider>
        <CoinsProvider>
          <SiteTitle />
          {children}
          <SplashAdWrapper />
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
        </CoinsProvider>
      </AuthProvider>
    </SWRConfig>
  );
}
