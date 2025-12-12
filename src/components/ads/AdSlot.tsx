'use client';

import { useEffect, useState, memo } from 'react';
import { AdBanner, AdData } from './AdBanner';

interface AdSlotResponse {
  ad: AdData | null;
  slotId: string | null;
}

interface AdSlotProps {
  position: string;
  width?: number;
  height?: number;
  className?: string;
  /** Enable responsive sizing for mobile devices */
  responsive?: boolean;
}

/**
 * AdSlot Component
 * Fetches and displays an ad for a specific slot position.
 * 
 * Requirements: 3.1, 3.4, 4.1, 4.2
 * - Fetch ad for position using API (3.1)
 * - Handle loading and error states
 * - Hide gracefully when no ad or VIP user (3.4, 4.1, 4.2)
 * - Support responsive sizing for mobile devices
 */
export const AdSlot = memo(function AdSlot({
  position,
  width = 728,
  height = 90,
  className = '',
  responsive = true,
}: AdSlotProps) {
  const [ad, setAd] = useState<AdData | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(width);

  // Handle responsive sizing
  useEffect(() => {
    if (!responsive || typeof window === 'undefined') return;

    const updateWidth = () => {
      // Get viewport width minus padding (32px = 16px * 2)
      const viewportWidth = window.innerWidth - 32;
      // Use smaller of viewport width or original width
      setContainerWidth(Math.min(viewportWidth, width));
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [responsive, width]);

  // Calculate responsive height maintaining aspect ratio
  const aspectRatio = width / height;
  const responsiveHeight = Math.round(containerWidth / aspectRatio);

  useEffect(() => {
    let cancelled = false;

    async function fetchAd() {
      try {
        setLoading(true);
        setError(false);

        // Get auth token if available
        const token = typeof window !== 'undefined' 
          ? localStorage.getItem('accessToken') 
          : null;

        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/ads/slot/${encodeURIComponent(position)}`, {
          headers,
        });

        if (cancelled) return;

        if (!response.ok) {
          // Graceful degradation - hide slot on error
          setAd(null);
          setSlotId(null);
          return;
        }

        const data: AdSlotResponse = await response.json();
        
        if (cancelled) return;

        setAd(data.ad);
        setSlotId(data.slotId);
      } catch {
        if (cancelled) return;
        // Graceful degradation - hide slot on error (Requirements: 3.4)
        setError(true);
        setAd(null);
        setSlotId(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAd();

    return () => {
      cancelled = true;
    };
  }, [position]);

  // Hide gracefully when loading, error, or no ad (Requirements: 3.4, 4.1, 4.2)
  if (loading) {
    // Show a subtle placeholder during loading to prevent layout shift
    return (
      <div 
        className={`bg-surface-secondary/30 rounded mx-auto ${className}`}
        style={{ 
          width: responsive ? containerWidth : width, 
          height: responsive ? responsiveHeight : height,
          maxWidth: '100%',
        }}
        aria-hidden="true"
      />
    );
  }

  // Hide completely when no ad available (VIP users, no active ads, etc.)
  if (error || !ad || !slotId) {
    return null;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <AdBanner
        ad={ad}
        slotId={slotId}
        width={responsive ? containerWidth : width}
        height={responsive ? responsiveHeight : height}
        responsive={responsive}
      />
    </div>
  );
});
