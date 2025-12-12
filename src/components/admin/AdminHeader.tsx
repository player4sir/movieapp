'use client';

import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function AdminHeader({ title, onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAdminAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/console-x9k2m/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 h-14 bg-surface border-b border-surface-secondary z-30">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-secondary"
            aria-label="打开菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-sm text-foreground/60">
            {user?.nickname || user?.username}
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-surface-secondary rounded-lg transition-colors"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
