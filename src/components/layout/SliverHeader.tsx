'use client';

import { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SliverHeaderProps {
  title?: string;
  showSearch?: boolean;
  showBack?: boolean;
  children?: ReactNode; // CategoryMenu 等子内容
  scrollContainerSelector?: string; // 滚动容器选择器
  searchHref?: string; // 自定义搜索链接
}

export function SliverHeader({
  title = '影视',
  showSearch = true,
  showBack = false,
  children,
  scrollContainerSelector = '#main-scroll',
  searchHref = '/search',
}: SliverHeaderProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const currentScrollY = target.scrollTop;
    const scrollDelta = currentScrollY - lastScrollY.current;

    // 向下滚动超过阈值 -> 收起 Header
    if (scrollDelta > scrollThreshold && currentScrollY > 56) {
      setIsCollapsed(true);
    }
    // 向上滚动超过阈值 -> 展开 Header
    else if (scrollDelta < -scrollThreshold) {
      setIsCollapsed(false);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector(scrollContainerSelector);
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [scrollContainerSelector, handleScroll]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 lg:left-64 z-50 bg-background border-b border-surface-secondary
        transition-transform duration-300 ease-out`}
      style={{
        transform: isCollapsed ? 'translateY(-56px)' : 'translateY(0)',
      }}
    >
      {/* Inner container with max-width for large screens */}
      <div className="max-w-screen-2xl mx-auto">
        {/* Header 部分 */}
        <header className="h-14 flex items-center justify-between px-4 pt-safe-top">
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
                href={searchHref}
                className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full hover:bg-surface active:bg-surface-secondary"
                aria-label="搜索"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Link>
            )}
          </div>
        </header>

        {/* 子内容（CategoryMenu） */}
        {children}
      </div>
    </div>
  );
}
