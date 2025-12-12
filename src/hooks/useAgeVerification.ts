'use client';

import { useState, useEffect, useCallback } from 'react';

const AGE_VERIFIED_KEY = 'adult_age_verified';

export interface AgeVerificationState {
  verified: boolean;
  timestamp: number;
}

export interface UseAgeVerificationResult {
  isVerified: boolean;
  loading: boolean;
  verify: () => void;
  reset: () => void;
}

/**
 * Reads the age verification state from localStorage
 */
export function readAgeVerificationState(): AgeVerificationState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(AGE_VERIFIED_KEY);
    if (!stored) return null;
    
    const state = JSON.parse(stored) as AgeVerificationState;
    if (typeof state.verified !== 'boolean' || typeof state.timestamp !== 'number') {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

/**
 * Writes the age verification state to localStorage
 */
export function writeAgeVerificationState(state: AgeVerificationState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(AGE_VERIFIED_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Clears the age verification state from localStorage
 */
export function clearAgeVerificationState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(AGE_VERIFIED_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Hook for managing age verification state
 * - Stores verification status in localStorage for the session
 * - Provides verify and reset functions
 */
export function useAgeVerification(): UseAgeVerificationResult {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = readAgeVerificationState();
    if (state?.verified) {
      setIsVerified(true);
    }
    setLoading(false);
  }, []);

  const verify = useCallback(() => {
    const state: AgeVerificationState = {
      verified: true,
      timestamp: Date.now(),
    };
    writeAgeVerificationState(state);
    setIsVerified(true);
  }, []);

  const reset = useCallback(() => {
    clearAgeVerificationState();
    setIsVerified(false);
  }, []);

  return {
    isVerified,
    loading,
    verify,
    reset,
  };
}
