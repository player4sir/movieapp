'use client';

import { useState, useEffect } from 'react';
import { SplashAd } from './SplashAd';

const SPLASH_AD_KEY = 'splash_ad_last_shown';
const SPLASH_AD_DAY_KEY = 'splash_ad_last_day';
const SPLASH_AD_INTERVAL = 30 * 60 * 1000; // 30 minutes between splash ads
const SPLASH_AD_DAILY_FIRST = true; // Always show on first visit of the day

/**
 * SplashAdWrapper Component
 * Manages splash ad display logic with frequency control.
 * 
 * Features:
 * - Shows splash ad on first visit of each day
 * - Respects interval between ads (30 min default)
 * - Stores last shown time in localStorage (persists across sessions)
 * - Gracefully handles localStorage errors
 */
export function SplashAdWrapper() {
  const [showSplash, setShowSplash] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const now = Date.now();
      const today = new Date().toDateString();

      // Check last shown time
      const lastShown = localStorage.getItem(SPLASH_AD_KEY);
      const lastDay = localStorage.getItem(SPLASH_AD_DAY_KEY);

      // Determine if we should show splash ad
      let shouldShow = false;

      // Show on first visit of the day
      if (SPLASH_AD_DAILY_FIRST && lastDay !== today) {
        shouldShow = true;
      }
      // Or if enough time has passed since last shown
      else if (!lastShown || (now - parseInt(lastShown, 10)) > SPLASH_AD_INTERVAL) {
        shouldShow = true;
      }

      setShowSplash(shouldShow);
    } catch {
      // localStorage might be disabled, still allow showing splash
      setShowSplash(true);
    }

    setChecked(true);
  }, []);

  const handleClose = () => {
    setShowSplash(false);
    try {
      const now = Date.now();
      const today = new Date().toDateString();
      localStorage.setItem(SPLASH_AD_KEY, now.toString());
      localStorage.setItem(SPLASH_AD_DAY_KEY, today);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Don't render anything until we've checked
  if (!checked) return null;

  if (!showSplash) return null;

  return (
    <SplashAd
      duration={5}
      skipDelay={2}
      onClose={handleClose}
    />
  );
}

export default SplashAdWrapper;
