'use client';

import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks';

/**
 * Component that updates the document title based on site settings.
 * This handles the dynamic browser tab title update.
 */
export function SiteTitle() {
    const { settings, loading } = useSiteSettings();

    useEffect(() => {
        // Only update title after settings are loaded (not during loading state)
        if (!loading && settings.site_name) {
            console.log('[SiteTitle] Updating document.title to:', settings.site_name);
            document.title = settings.site_name;
        }
    }, [settings.site_name, loading]);

    return null; // This component doesn't render anything
}
