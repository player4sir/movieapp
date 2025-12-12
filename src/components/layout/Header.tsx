'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showBack?: boolean;
}

export function Header({ title = '影视', showSearch = true, showBack = false }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-surface-secondary">
      <div className="flex items-center justify-between h-14 px-4 pt-safe-top">
        {/* Left section */}
        <div className="flex items-center min-w-[44px]">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-surface active:bg-surface-secondary"
              aria-label="返回"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <Link href="/" className="text-xl font-bold text-primary">
              {title}
            </Link>
          )}
        </div>

        {/* Center title (when showing back button) */}
        {showBack && (
          <h1 className="text-lg font-semibold truncate max-w-[200px]">{title}</h1>
        )}

        {/* Right section */}
        <div className="flex items-center min-w-[44px] justify-end">
          {showSearch && (
            <Link
              href="/search"
              className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full hover:bg-surface active:bg-surface-secondary"
              aria-label="搜索"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
