'use client';

/**
 * PaywallBadge Component
 * Displays content pricing or VIP free indicator
 * Shows unlocked status for purchased content
 * 
 * Requirements: 2.1 - Display unlock price based on content category
 * Requirements: 2.2 - Indicate Normal_Content is free for VIP
 * Requirements: 2.3 - Indicate both content types are free for SVIP
 * Requirements: 2.4 - Display unlocked status
 */

import { AccessResult, AccessType } from '@/hooks';

interface PaywallBadgeProps {
  accessResult: AccessResult | null;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PaywallBadge({ 
  accessResult, 
  loading = false, 
  className = '',
  size = 'md'
}: PaywallBadgeProps) {
  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Loading state
  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 ${sizeClasses[size]} bg-surface rounded animate-pulse ${className}`}>
        <div className="w-12 h-4 bg-foreground/10 rounded" />
      </div>
    );
  }

  // No access result
  if (!accessResult) {
    return null;
  }

  const { hasAccess, accessType, price } = accessResult;

  // Render based on access type
  return (
    <div className={`inline-flex items-center gap-1 ${sizeClasses[size]} rounded font-medium ${getBadgeStyles(accessType, hasAccess)} ${className}`}>
      {getBadgeIcon(accessType, hasAccess)}
      <span>{getBadgeText(accessType, hasAccess, price)}</span>
    </div>
  );
}

/**
 * Get badge background and text color styles
 */
function getBadgeStyles(accessType: AccessType, hasAccess: boolean): string {
  if (hasAccess) {
    switch (accessType) {
      case 'vip':
        return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30';
      case 'purchased':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'free':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-surface text-foreground/70';
    }
  }
  
  // Preview mode (no access)
  return 'bg-primary/20 text-primary border border-primary/30';
}

/**
 * Get badge icon based on access type
 */
function getBadgeIcon(accessType: AccessType, hasAccess: boolean): React.ReactNode {
  if (hasAccess) {
    switch (accessType) {
      case 'vip':
        return <VipIcon className="w-3.5 h-3.5" />;
      case 'purchased':
        return <UnlockedIcon className="w-3.5 h-3.5" />;
      case 'free':
        return <FreeIcon className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  }
  
  // Preview mode - show coin icon with price
  return <CoinIcon className="w-3.5 h-3.5" />;
}

/**
 * Get badge text based on access type
 */
function getBadgeText(accessType: AccessType, hasAccess: boolean, price?: number): string {
  if (hasAccess) {
    switch (accessType) {
      case 'vip':
        return '会员免费';
      case 'purchased':
        return '已解锁';
      case 'free':
        return '免费';
      default:
        return '可观看';
    }
  }
  
  // Preview mode - show price
  return price !== undefined ? `${price}金币` : '付费';
}

// Icon components
function VipIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );
}

function UnlockedIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}

function FreeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

function CoinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold">¥</text>
    </svg>
  );
}

export default PaywallBadge;
