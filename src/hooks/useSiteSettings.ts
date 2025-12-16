'use client';

import { useState, useEffect, useCallback } from 'react';

interface SiteSettingsData {
    site_name: string;
    site_description: string;
    site_logo: string;
    site_copyright: string;
}

const DEFAULT_SETTINGS: SiteSettingsData = {
    site_name: '影视流媒体',
    site_description: '移动端影视流媒体应用，提供影视内容浏览、搜索、播放功能',
    site_logo: '',
    site_copyright: '© 2024 影视流媒体',
};

// Cache for site settings
let cachedSettings: SiteSettingsData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for fetching and caching site settings
 */
export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettingsData>(cachedSettings || DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(!cachedSettings);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async (force = false) => {
        // Use cache if valid
        const now = Date.now();
        if (!force && cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
            setSettings(cachedSettings);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/site-settings');
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                cachedSettings = data;
                cacheTimestamp = now;
            } else {
                setError('Failed to fetch settings');
                setSettings(DEFAULT_SETTINGS);
            }
        } catch (err) {
            console.error('Failed to fetch site settings:', err);
            setError('Failed to fetch settings');
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return {
        settings,
        loading,
        error,
        refresh: () => fetchSettings(true),
    };
}

/**
 * Invalidate the cache (call after admin updates settings)
 */
export function invalidateSiteSettingsCache() {
    cachedSettings = null;
    cacheTimestamp = 0;
}

export type { SiteSettingsData };
