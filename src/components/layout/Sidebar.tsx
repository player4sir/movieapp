'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, User, Search } from 'lucide-react';
import { useSiteSettings } from '@/hooks';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    {
        href: '/',
        label: '精品影视',
        icon: <Home className="w-5 h-5" />,
    },
    {
        href: '/adult',
        label: '成人内容',
        icon: <Film className="w-5 h-5" />,
    },
    {
        href: '/search',
        label: '搜索',
        icon: <Search className="w-5 h-5" />,
    },
    {
        href: '/profile',
        label: '个人中心',
        icon: <User className="w-5 h-5" />,
    },
];

/**
 * Desktop sidebar navigation component.
 * Only visible on lg breakpoint and above.
 */
export function Sidebar() {
    const pathname = usePathname();
    const { settings } = useSiteSettings();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-surface-secondary hidden lg:flex flex-col z-40">
            {/* Brand Logo */}
            <div className="h-16 flex items-center px-6 border-b border-surface-secondary">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Film className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">{settings.site_name}</span>
                </Link>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-foreground/70 hover:bg-surface hover:text-foreground'
                                }
              `}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                            {active && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-surface-secondary">
                <p className="text-xs text-foreground/40 text-center">
                    {settings.site_copyright}
                </p>
            </div>
        </aside>
    );
}
