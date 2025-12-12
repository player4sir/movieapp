'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Component to capture referral code from URL and store in localStorage.
 * Usage: Mount specifically in global layout or providers.
 * URL pattern: /?ref=CODE or /register?ref=CODE
 */
export function ReferralTracker() {
    const searchParams = useSearchParams();
    const refCode = searchParams.get('ref');

    useEffect(() => {
        if (refCode) {
            // Store referral code if present
            localStorage.setItem('referralCode', refCode);
            console.log('Referral code captured:', refCode);
        }
    }, [refCode]);

    return null; // Render nothing
}
