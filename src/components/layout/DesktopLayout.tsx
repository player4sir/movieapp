'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface DesktopLayoutProps {
    children: ReactNode;
    /** Whether to show the sidebar (default: true) */
    showSidebar?: boolean;
    /** Additional class names for the main content area */
    className?: string;
}

/**
 * Desktop-aware layout wrapper component.
 * Provides max-width constraints, sidebar navigation for desktop,
 * and responsive layout adjustments.
 */
export function DesktopLayout({
    children,
    showSidebar = true,
    className = ''
}: DesktopLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar - only visible on lg and above */}
            {showSidebar && <Sidebar />}

            {/* Main content area */}
            <div
                className={`
          ${showSidebar ? 'lg:pl-64' : ''}
          min-h-screen
          ${className}
        `}
            >
                {/* Content container with max-width for very large screens */}
                <div className="max-w-screen-2xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
