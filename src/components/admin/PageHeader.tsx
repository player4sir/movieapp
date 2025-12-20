'use client';

/**
 * PageHeader Component - Reusable header with back navigation
 * For agent sub-pages navigation
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
    title: string;
    backHref?: string;
    backLabel?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, backHref = '/console-x9k2m/agents', backLabel = '代理管理', children }: PageHeaderProps) {
    const router = useRouter();

    return (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/30 mb-4">
            <div className="p-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={backHref}
                        className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">{backLabel}</span>
                    </Link>
                    <div className="w-px h-4 bg-border/30" />
                    <h1 className="text-lg font-semibold flex-1">{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    );
}
