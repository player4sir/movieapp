'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdBanner, AdData } from './AdBanner';

interface AdCarouselProps {
    ads: AdData[];
    slotId: string;
    width: number;
    height: number;
    displayMode?: 'cover' | 'contain';
    interval?: number; // Seconds between slides
    className?: string;
}

/**
 * AdCarousel Component
 * Automatically rotates through multiple ads with smooth transitions.
 * 
 * Features:
 * - Auto-advance with configurable interval
 * - Manual navigation dots (resets and restarts timer)
 * - Smooth fade transitions
 * - Pause on hover (desktop)
 */
export function AdCarousel({
    ads,
    slotId,
    width,
    height,
    displayMode = 'cover',
    interval = 5,
    className = '',
}: AdCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Clear timer helper
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Start timer helper
    const startTimer = useCallback(() => {
        clearTimer();
        if (ads.length > 1 && !isPaused) {
            timerRef.current = setInterval(() => {
                setIsTransitioning(true);
                setTimeout(() => {
                    setCurrentIndex(prev => (prev + 1) % ads.length);
                    setIsTransitioning(false);
                }, 150); // Half of transition duration
            }, interval * 1000);
        }
    }, [ads.length, interval, isPaused, clearTimer]);

    // Auto-advance carousel
    useEffect(() => {
        startTimer();
        return () => clearTimer();
    }, [startTimer, clearTimer]);

    // Handle dot click - go to slide and restart timer
    const goToSlide = useCallback((index: number) => {
        if (index === currentIndex) return;

        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setIsTransitioning(false);
        }, 150);

        // Restart timer after manual navigation
        startTimer();
    }, [currentIndex, startTimer]);

    if (ads.length === 0) return null;

    // Single ad - no carousel needed
    if (ads.length === 1) {
        return (
            <div className={className}>
                <AdBanner
                    ad={ads[0]}
                    slotId={slotId}
                    width={width}
                    height={height}
                    displayMode={displayMode}
                />
            </div>
        );
    }

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Current slide with fade transition */}
            <div
                className={`relative transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            >
                <AdBanner
                    key={ads[currentIndex].id}
                    ad={ads[currentIndex]}
                    slotId={slotId}
                    width={width}
                    height={height}
                    displayMode={displayMode}
                />
            </div>

            {/* Navigation dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {ads.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                            ? 'bg-white scale-110'
                            : 'bg-white/50 hover:bg-white/70'
                            }`}
                        aria-label={`Go to ad ${index + 1}`}
                    />
                ))}
            </div>

            {/* Carousel indicator */}
            <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] text-white/60 bg-black/30 rounded">
                {currentIndex + 1}/{ads.length}
            </span>
        </div>
    );
}

export default AdCarousel;
