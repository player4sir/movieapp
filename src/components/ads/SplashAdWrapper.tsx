'use client';

import { useState, useEffect } from 'react';
import { SplashAd } from './SplashAd';

const SPLASH_AD_KEY = 'lastSplashAdTime';
const SPLASH_AD_INTERVAL = 30 * 60 * 1000; // 30 minutes between splash ads

/**
 * SplashAdWrapper Component
 * Manages splash ad display logic with frequency control.
 * 
 * Features:
 * - Shows splash ad on first visit
 * - Respects interval between ads (30 min default)
 * - Stores last shown time in sessionStorage
 */
export function SplashAdWrapper() {
  const [showSplash, setShowSplash] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if we should show splash ad
    const lastShown = sessionStorage.getItem(SPLASH_AD_KEY);
    const now = Date.now();

    if (!lastShown || (now - parseInt(lastShown, 10)) > SPLASH_AD_INTERVAL) {
      setShowSplash(true);
    }
    
    setChecked(true);
  }, []);

  const handleClose = () => {
    setShowSplash(false);
    sessionStorage.setItem(SPLASH_AD_KEY, Date.now().toString());
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
