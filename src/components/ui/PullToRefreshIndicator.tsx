'use client';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  threshold?: number;
}

/**
 * Visual indicator for pull-to-refresh
 * Shows spinner when refreshing, arrow when pulling
 */
export function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const rotation = pullProgress * 180;
  const opacity = Math.min(pullProgress * 1.5, 1);
  const scale = 0.5 + pullProgress * 0.5;

  return (
    <div
      className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-10"
      style={{
        top: 0,
        height: `${Math.max(pullDistance, isRefreshing ? threshold : 0)}px`,
        transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          opacity,
          transform: `scale(${scale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {isRefreshing ? (
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-6 h-6 text-gray-500"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
        {!isRefreshing && pullProgress >= 1 && (
          <span className="ml-2 text-sm text-gray-500">释放刷新</span>
        )}
        {isRefreshing && (
          <span className="ml-2 text-sm text-blue-500">刷新中...</span>
        )}
      </div>
    </div>
  );
}

export default PullToRefreshIndicator;
