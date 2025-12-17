'use client';

import { useEffect, useState, memo } from 'react';
import { AdBanner, AdData } from './AdBanner';
import { AdCarousel } from './AdCarousel';

interface SlotConfig {
    displayMode: 'cover' | 'contain';
    maxVisible: number;
    carouselInterval: number;
    width: number;
    height: number;
}

interface MultiAdSlotResponse {
    ads: AdData[];
    slotId: string | null;
    slotConfig: SlotConfig | null;
}

interface AdSlotGroupProps {
    position: string;
    className?: string;
    /** Gap between ads in pixels */
    gap?: number;
}

/**
 * AdSlotGroup Component
 * Displays multiple ads in a vertical layout.
 * 
 * Layout logic:
 * - Shows up to (maxVisible - 1) ads directly
 * - Uses carousel for remaining ads in the last slot
 * - All ads stacked vertically
 * 
 * Example with maxVisible=3 and 5 ads:
 * ┌──────────┐
 * │   Ad 1   │
 * ├──────────┤
 * │   Ad 2   │
 * ├──────────┤
 * │ Carousel │  ← Contains ads 3, 4, 5
 * │  (3,4,5) │
 * └──────────┘
 */
export const AdSlotGroup = memo(function AdSlotGroup({
    position,
    className = '',
    gap = 12,
}: AdSlotGroupProps) {
    const [ads, setAds] = useState<AdData[]>([]);
    const [slotId, setSlotId] = useState<string | null>(null);
    const [slotConfig, setSlotConfig] = useState<SlotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [containerWidth, setContainerWidth] = useState(728);

    // Handle responsive sizing
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateWidth = () => {
            const viewportWidth = window.innerWidth - 32;
            setContainerWidth(Math.min(viewportWidth, slotConfig?.width ?? 728));
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [slotConfig?.width]);

    // Fetch all ads for this position with sessionStorage caching
    useEffect(() => {
        let cancelled = false;
        const cacheKey = `ad_slot_${position}`;
        const cacheTTL = 5 * 60 * 1000; // 5 minutes cache for performance

        async function fetchAds() {
            try {
                // Check cache first
                if (typeof window !== 'undefined') {
                    const cached = sessionStorage.getItem(cacheKey);
                    if (cached) {
                        try {
                            const { data, timestamp, configVersion } = JSON.parse(cached);
                            const currentConfigVersion = localStorage.getItem('ad_config_version') || '0';

                            // Use cache if: within TTL AND config version hasn't changed
                            const isCacheValid = Date.now() - timestamp < cacheTTL;
                            const isConfigUnchanged = configVersion === currentConfigVersion;

                            if (isCacheValid && isConfigUnchanged) {
                                setAds(data.ads ?? []);
                                setSlotId(data.slotId);
                                setSlotConfig(data.slotConfig);
                                setLoading(false);
                                return;
                            }
                        } catch {
                            sessionStorage.removeItem(cacheKey);
                        }
                    }
                }

                setLoading(true);

                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('accessToken')
                    : null;

                const headers: HeadersInit = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(`/api/ads/multi-slot/${encodeURIComponent(position)}`, {
                    headers,
                });

                if (cancelled) return;

                if (!response.ok) {
                    setAds([]);
                    setSlotId(null);
                    setSlotConfig(null);
                    return;
                }

                const data: MultiAdSlotResponse = await response.json();

                if (cancelled) return;

                // Cache the response with config version for smart invalidation
                if (typeof window !== 'undefined') {
                    const configVersion = localStorage.getItem('ad_config_version') || '0';
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        data,
                        timestamp: Date.now(),
                        configVersion, // Store version to detect admin changes
                    }));
                }

                setAds(data.ads ?? []);
                setSlotId(data.slotId);
                setSlotConfig(data.slotConfig);
            } catch {
                if (!cancelled) {
                    setAds([]);
                    setSlotId(null);
                    setSlotConfig(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchAds();

        return () => {
            cancelled = true;
        };
    }, [position]);

    // Calculate responsive height
    const aspectRatio = (slotConfig?.width ?? 728) / (slotConfig?.height ?? 90);
    const responsiveHeight = Math.round(containerWidth / aspectRatio);

    // Loading state - show minimal skeleton to reserve space without being intrusive
    if (loading) {
        return (
            <div className={`${className}`}>
                <div
                    className="bg-surface-secondary/20 rounded-xl mx-auto transition-opacity"
                    style={{
                        width: containerWidth,
                        height: responsiveHeight,
                        minHeight: 60, // Minimum height to reserve space
                    }}
                />
            </div>
        );
    }

    // No ads available - render nothing but don't cause layout shift
    // Using a minimal height container that collapses smoothly
    if (ads.length === 0 || !slotId || !slotConfig) {
        return null;
    }

    const maxVisible = slotConfig.maxVisible;

    // Case 1: Fewer ads than maxVisible - show all directly
    if (ads.length <= maxVisible) {
        return (
            <div className={`flex flex-col items-center ${className}`} style={{ gap }}>
                {ads.map((ad) => (
                    <AdBanner
                        key={ad.id}
                        ad={ad}
                        slotId={slotId}
                        width={containerWidth}
                        height={responsiveHeight}
                        displayMode={slotConfig.displayMode}
                    />
                ))}
            </div>
        );
    }

    // Case 2: More ads than maxVisible - show (maxVisible-1) directly + carousel for rest
    const directAds = ads.slice(0, maxVisible - 1);
    const carouselAds = ads.slice(maxVisible - 1);

    return (
        <div className={`flex flex-col items-center ${className}`} style={{ gap }}>
            {/* Direct ads */}
            {directAds.map((ad) => (
                <AdBanner
                    key={ad.id}
                    ad={ad}
                    slotId={slotId}
                    width={containerWidth}
                    height={responsiveHeight}
                    displayMode={slotConfig.displayMode}
                />
            ))}

            {/* Carousel for overflow ads */}
            <AdCarousel
                ads={carouselAds}
                slotId={slotId}
                width={containerWidth}
                height={responsiveHeight}
                displayMode={slotConfig.displayMode}
                interval={slotConfig.carouselInterval}
            />
        </div>
    );
});

export default AdSlotGroup;
