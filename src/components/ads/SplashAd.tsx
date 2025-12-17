'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface AdData {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
}

interface SplashAdResponse {
  ad: AdData | null;
  slotId: string | null;
}

interface SplashAdProps {
  /** Duration in seconds before auto-close (default: 5) */
  duration?: number;
  /** Callback when ad is closed or skipped */
  onClose?: () => void;
  /** Skip button delay in seconds (default: 2) */
  skipDelay?: number;
}

/**
 * SplashAd Component
 * Full-screen splash ad shown on app launch.
 * 
 * Features:
 * - Full-screen display
 * - Countdown timer
 * - Skip button (appears after delay)
 * - Auto-close after duration
 * - Click tracking
 * - All users see ads (no VIP exemption)
 */
export function SplashAd({
  duration = 5,
  onClose,
  skipDelay = 2,
}: SplashAdProps) {
  const [ad, setAd] = useState<AdData | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(duration);
  const [canSkip, setCanSkip] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shouldClose, setShouldClose] = useState(false); // New: track when to close

  const impressionRecorded = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const skipTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Store onClose in ref to avoid including in dependency arrays
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Handle deferred close via state change
  useEffect(() => {
    if (shouldClose) {
      onCloseRef.current?.();
    }
  }, [shouldClose]);

  // Fetch splash ad
  useEffect(() => {
    let cancelled = false;

    async function fetchAd() {
      try {
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;

        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/ads/slot/splash', { headers });

        if (cancelled) return;

        if (!response.ok) {
          setShouldClose(true);
          return;
        }

        const data: SplashAdResponse = await response.json();

        if (cancelled) return;

        if (!data.ad || !data.slotId) {
          setShouldClose(true);
          return;
        }

        setAd(data.ad);
        setSlotId(data.slotId);
      } catch {
        if (!cancelled) {
          setShouldClose(true);
        }
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
  }, []); // No dependencies - run once on mount

  // Record impression when ad is shown
  useEffect(() => {
    if (!ad || !slotId || impressionRecorded.current || !imageLoaded) return;
    impressionRecorded.current = true;

    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId: ad.id, slotId }),
    }).catch(() => { });
  }, [ad, slotId, imageLoaded]);

  // Start countdown when image is loaded
  useEffect(() => {
    if (!imageLoaded || !ad) return;

    // Countdown timer
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Defer close to avoid updating state during render
          setShouldClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Skip button delay
    skipTimerRef.current = setTimeout(() => {
      setCanSkip(true);
    }, skipDelay * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, [imageLoaded, ad, skipDelay]); // Remove onClose from deps

  // Handle ad click
  const handleClick = useCallback(async () => {
    if (!ad || !slotId) return;

    // Record click
    try {
      await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, slotId }),
      });
    } catch { }

    // Open target URL
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
  }, [ad, slotId]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    setShouldClose(true);
  }, []);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setShouldClose(true);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // No ad available
  if (!ad) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Ad Image */}
      <div
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />

        {/* Loading placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Skip/Countdown Button */}
      {imageLoaded && (
        <button
          onClick={canSkip ? handleSkip : undefined}
          className={`absolute top-12 right-4 px-4 py-2 rounded-full text-sm font-medium transition-all ${canSkip
            ? 'bg-white/20 text-white backdrop-blur-sm active:bg-white/30'
            : 'bg-black/40 text-white/80'
            }`}
        >
          {canSkip ? '跳过' : `${countdown}s`}
        </button>
      )}

      {/* Ad indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="px-3 py-1 bg-black/40 text-white/60 text-xs rounded-full backdrop-blur-sm">
          广告
        </span>
      </div>
    </div>
  );
}

export default SplashAd;

