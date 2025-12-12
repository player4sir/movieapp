'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  showSearch?: boolean;
  showBack?: boolean;
}

export function MobileLayout({
  children,
  title,
  showHeader = true,
  showBottomNav = true,
  showSearch = true,
  showBack = false,
}: MobileLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {showHeader && (
        <Header title={title} showSearch={showSearch} showBack={showBack} />
      )}
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}
