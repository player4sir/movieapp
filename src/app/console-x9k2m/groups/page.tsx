'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Groups Page - Redirects to Users Page
 * Group management is now integrated into the users page (Requirements 1.1)
 */
export default function GroupsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to users page where group management is now integrated
    router.replace('/console-x9k2m/users');
  }, [router]);

  return (
    <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground/60">正在跳转到用户管理...</p>
      </div>
    </div>
  );
}

