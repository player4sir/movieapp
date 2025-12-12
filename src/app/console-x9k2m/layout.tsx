'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';
import { AdminSidebar, AdminBottomNav, ToastProvider } from '@/components/admin';
import { setupGlobalFetchInterceptor } from '@/lib/api-client';

/**
 * Admin Layout
 * Protected admin routes - verifies admin role before granting access
 * Responsive: sidebar on desktop, bottom nav on mobile
 * PWA: handles safe area insets for notch/home indicator
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Install global fetch interceptor for automatic 401 handling in admin area
  useEffect(() => {
    setupGlobalFetchInterceptor();
  }, []);

  return (
    <AdminAuthProvider>
      <ToastProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </ToastProvider>
    </AdminAuthProvider>
  );
}

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login page doesn't need authorization check
  const isLoginPage = pathname === '/console-x9k2m/login';

  useEffect(() => {
    if (loading) {
      if (authState !== 'loading') setAuthState('loading');
      return;
    }

    // Skip auth check for login page
    if (isLoginPage) {
      if (authState !== 'authorized') setAuthState('authorized');
      return;
    }

    if (!isAuthenticated || user?.role !== 'admin') {
      if (authState !== 'unauthorized') {
        setAuthState('unauthorized');
        router.replace('/console-x9k2m/login');
      }
      return;
    }

    if (authState !== 'authorized') setAuthState('authorized');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user?.role, isLoginPage]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Show loading state
  if (authState === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen min-h-[100dvh] bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Unauthorized - show nothing while redirecting
  if (authState === 'unauthorized') {
    return (
      <div className="flex items-center justify-center min-h-screen min-h-[100dvh] bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Login page renders without navigation
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Sidebar (desktop always visible, mobile as drawer) */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header with safe area for notch */}
      <header
        className="fixed top-0 left-0 right-0 lg:left-64 bg-surface border-b border-surface-secondary z-30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-secondary active:bg-surface-secondary"
            aria-label="打开菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="lg:hidden" />
        </div>
      </header>

      {/* Main content with safe area padding */}
      <main
        className="lg:ml-64 min-h-screen min-h-[100dvh]"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="lg:pb-4">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <AdminBottomNav />
    </div>
  );
}
