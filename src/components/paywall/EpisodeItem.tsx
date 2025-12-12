'use client';

/**
 * EpisodeItem Component
 * Displays an episode with lock/unlock indicator and price
 * 
 * Requirements: 5.4 - Display which episodes are unlocked
 */

import { useRouter } from 'next/navigation';
import { useAuth, AccessResult } from '@/hooks';

interface EpisodeItemProps {
  episodeName: string;
  episodeIndex: number;
  vodId: number;
  sourceIndex: number;
  sourceCategory?: 'normal' | 'adult';
  accessResult?: AccessResult | null;
  loading?: boolean;
}

export function EpisodeItem({
  episodeName,
  episodeIndex,
  vodId,
  sourceIndex,
  sourceCategory,
  accessResult,
  loading = false,
}: EpisodeItemProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const href = `/play/${vodId}?source=${sourceIndex}&ep=${episodeIndex}${sourceCategory ? `&sourceCategory=${sourceCategory}` : ''}`;
  
  // Determine if episode is unlocked
  const isUnlocked = accessResult?.hasAccess ?? false;
  const price = accessResult?.price;
  const accessType = accessResult?.accessType;

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    router.push(href);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center justify-center px-2 py-2 text-sm text-center rounded-lg transition-colors truncate ${getEpisodeStyles(isUnlocked, accessType)}`}
    >
      {/* Episode name */}
      <span className="truncate">{episodeName}</span>
      
      {/* Lock/Unlock indicator */}
      {!loading && sourceCategory && (
        <div className="absolute top-0.5 right-0.5">
          {isUnlocked ? (
            <UnlockedIndicator accessType={accessType} />
          ) : (
            <LockedIndicator price={price} />
          )}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-0.5 right-0.5">
          <div className="w-3 h-3 bg-foreground/10 rounded-full animate-pulse" />
        </div>
      )}
    </button>
  );
}

/**
 * Get episode button styles based on unlock status
 */
function getEpisodeStyles(isUnlocked: boolean, accessType?: string): string {
  if (isUnlocked) {
    switch (accessType) {
      case 'vip':
        return 'bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 active:bg-primary active:text-white';
      case 'purchased':
        return 'bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 active:bg-primary active:text-white';
      case 'free':
        return 'bg-surface hover:bg-surface-secondary active:bg-primary active:text-white';
      default:
        return 'bg-surface hover:bg-surface-secondary active:bg-primary active:text-white';
    }
  }
  
  // Locked episode
  return 'bg-surface hover:bg-surface-secondary active:bg-primary active:text-white';
}

/**
 * Unlocked indicator icon
 */
function UnlockedIndicator({ accessType }: { accessType?: string }) {
  const colorClass = accessType === 'vip' 
    ? 'text-amber-400' 
    : accessType === 'purchased' 
      ? 'text-green-400' 
      : 'text-blue-400';

  return (
    <div className={`flex items-center justify-center w-4 h-4 ${colorClass}`}>
      {accessType === 'vip' ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      )}
    </div>
  );
}

/**
 * Locked indicator with price
 */
function LockedIndicator({ price }: { price?: number }) {
  return (
    <div className="flex items-center gap-0.5 px-1 py-0.5 bg-primary/20 rounded text-primary">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
      </svg>
      {price !== undefined && (
        <span className="text-[10px] font-medium">{price}</span>
      )}
    </div>
  );
}

export default EpisodeItem;
