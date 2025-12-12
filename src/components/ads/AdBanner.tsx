'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, memo, useCallback } from 'react';

/**
 * Ad data structure returned from the API
 */
export interface AdData {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
}

interface AdBannerProps {
  ad: AdData;
  slotId: string;
  width?: number;
  height?: number;
  className?: string;
  /** Enable responsive sizing */
  responsive?: boolean;
  onImpression?: () => void;
  onClick?: () => void;
}

/**
 * Check if URL is a GIF image
 */
function isGifUrl(url: string): boolean {
  const lowercaseUrl = url.toLowerCase();
  return lowercaseUrl.endsWith('.gif') || lowercaseUrl.includes('.gif?');
}

/**
 * AdBanner Component
 * Displays a single ad banner with impression and click tracking.
 * 
 * Requirements: 3.1, 3.2, 3.3
 * - Display ad image with link (3.1)
 * - Handle impression tracking on mount (3.2)
 * - Handle click tracking on click (3.3)
 * - Support responsive sizing for mobile devices
 * - Support GIF animations (use native img for GIFs)
 */
export const AdBanner = memo(function AdBanner({
  ad,
  slotId,
  width = 728,
  height = 90,
  className = '',
  responsive = true,
  onImpression,
  onClick,
}: AdBannerProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const impressionRecorded = useRef(false);

  // Check if the image is a GIF
  const isGif = isGifUrl(ad.imageUrl);

  // Record impression on mount (Requirements: 3.2)
  useEffect(() => {
    if (impressionRecorded.current) return;
    impressionRecorded.current = true;

    // Fire-and-forget impression tracking
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId: ad.id, slotId }),
    }).catch(() => {
      // Silently ignore impression tracking errors
    });

    onImpression?.();
  }, [ad.id, slotId, onImpression]);

  // Handle click with tracking (Requirements: 3.3)
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    onClick?.();

    try {
      const response = await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, slotId }),
      });

      const data = await response.json();
      
      // Redirect to target URL
      if (data.targetUrl) {
        window.open(data.targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback to ad's target URL
        window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // On error, still redirect using the ad's target URL
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  }, [ad.id, ad.targetUrl, slotId, onClick]);

  if (imageError) {
    return null; // Hide banner if image fails to load
  }

  // Use responsive styles
  const containerStyle = responsive
    ? { width, height, maxWidth: '100%' }
    : { width, height };

  return (
    <a
      href={ad.targetUrl}
      onClick={handleClick}
      className={`block relative overflow-hidden cursor-pointer rounded-lg ${className}`}
      style={containerStyle}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`广告: ${ad.title}`}
    >
      {/* Loading skeleton */}
      {!imageLoaded && (
        <div 
          className="absolute inset-0 bg-surface-secondary animate-pulse rounded-lg"
        />
      )}
      
      {/* Use native img for GIFs to preserve animation, Next/Image for others */}
      {isGif ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className={`object-cover w-full h-full rounded-lg transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          src={ad.imageUrl}
          alt={ad.title}
          width={width}
          height={height}
          className={`object-cover w-full h-full rounded-lg transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          priority={false}
          sizes={responsive ? '(max-width: 768px) 100vw, 728px' : undefined}
        />
      )}
      
      {/* Ad indicator badge */}
      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium text-white/80 bg-black/50 rounded">
        广告
      </span>
    </a>
  );
});
