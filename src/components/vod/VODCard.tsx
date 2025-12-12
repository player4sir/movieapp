'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, memo } from 'react';
import type { VODItem } from '@/types/vod';

type SourceCategory = 'normal' | 'adult';

interface VODCardProps {
  vod: VODItem;
  priority?: boolean;
  sourceCategory?: SourceCategory;
}

export const VODCard = memo(function VODCard({ vod, priority = false, sourceCategory }: VODCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const posterUrl = vod.vod_pic || '';
  const hasValidPoster = posterUrl && !imageError;
  
  // Build detail URL with optional sourceCategory parameter
  const detailUrl = sourceCategory 
    ? `/detail/${vod.vod_id}?sourceCategory=${sourceCategory}`
    : `/detail/${vod.vod_id}`;

  return (
    <Link
      href={detailUrl}
      className="block group touch-manipulation will-change-transform"
    >
      <article 
        className="relative overflow-hidden rounded-xl bg-surface shadow-sm 
          transition-shadow duration-200 ease-out
          hover:shadow-xl hover:shadow-black/10
          active:opacity-90"
      >
        {/* Poster Image Container - 3:4 aspect ratio */}
        <div className="relative aspect-[3/4] bg-surface-secondary overflow-hidden">
          {hasValidPoster ? (
            <>
              {/* Simple skeleton loader - no animation to reduce jank */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-surface-secondary" />
              )}
              <Image
                src={posterUrl}
                alt={vod.vod_name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className={`object-cover transition-opacity duration-300
                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
              <svg className="w-10 h-10 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
            </div>
          )}

          {/* Remarks badge */}
          {vod.vod_remarks && (
            <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold text-white 
              bg-primary rounded">
              {vod.vod_remarks}
            </div>
          )}

          {/* Type badge */}
          {vod.type_name && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-medium text-white/90 
              bg-black/60 rounded">
              {vod.type_name}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="p-2.5">
          <h3 className="text-sm font-medium line-clamp-2 leading-snug text-foreground/90">
            {vod.vod_name}
          </h3>
        </div>
      </article>
    </Link>
  );
});

// Compact variant for horizontal lists
interface VODCardCompactProps {
  vod: VODItem;
  sourceCategory?: SourceCategory;
}

export const VODCardCompact = memo(function VODCardCompact({ vod, sourceCategory }: VODCardCompactProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const posterUrl = vod.vod_pic || '';
  const hasValidPoster = posterUrl && !imageError;
  
  // Build detail URL with optional sourceCategory parameter
  const detailUrl = sourceCategory 
    ? `/detail/${vod.vod_id}?sourceCategory=${sourceCategory}`
    : `/detail/${vod.vod_id}`;

  return (
    <Link
      href={detailUrl}
      className="flex-shrink-0 w-28 touch-manipulation"
    >
      <article className="relative overflow-hidden rounded-xl bg-surface shadow-sm
        transition-shadow duration-200 hover:shadow-lg active:opacity-90">
        <div className="relative aspect-[3/4] bg-surface-secondary overflow-hidden">
          {hasValidPoster ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-surface-secondary" />
              )}
              <Image
                src={posterUrl}
                alt={vod.vod_name}
                fill
                sizes="112px"
                className={`object-cover transition-opacity duration-300
                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
              <svg className="w-8 h-8 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
            </div>
          )}
          {vod.vod_remarks && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-semibold text-white bg-primary rounded">
              {vod.vod_remarks}
            </div>
          )}
        </div>
        <div className="p-2">
          <h3 className="text-xs font-medium line-clamp-1 text-foreground/80">
            {vod.vod_name}
          </h3>
        </div>
      </article>
    </Link>
  );
});
