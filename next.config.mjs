import withPWAInit from "@ducanh2912/next-pwa";

/**
 * PWA Cache Strategy - Coordinated with SWR and HTTP caching
 * 
 * Cache Time Summary:
 * ┌─────────────────┬──────────┬──────────┬──────────┐
 * │ Data Type       │ SWR      │ HTTP     │ PWA      │
 * ├─────────────────┼──────────┼──────────┼──────────┤
 * │ VOD List        │ 2 min    │ 1 min    │ 5 min    │
 * │ Categories      │ 30 min   │ 5 min    │ 30 min   │
 * │ VOD Detail      │ 5 min    │ 2 min    │ 10 min   │
 * │ Search          │ 0        │ 0        │ 1 min    │
 * │ Images          │ -        │ 30 days  │ 30 days  │
 * │ Static Assets   │ -        │ 1 year   │ 1 year   │
 * └─────────────────┴──────────┴──────────┴──────────┘
 */
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      // VOD List - short cache, frequent updates
      {
        urlPattern: /\/api\/vod\/list/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "vod-list-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 5, // 5 minutes - slightly longer than HTTP for offline
          },
        },
      },
      // Categories - longer cache, rarely changes
      {
        urlPattern: /\/api\/vod\/categories/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "vod-categories-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 30, // 30 minutes
          },
        },
      },
      // VOD Detail - moderate cache
      {
        urlPattern: /\/api\/vod\/\d+/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "vod-detail-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 10, // 10 minutes
          },
        },
      },
      // Search - network first, brief fallback cache
      {
        urlPattern: /\/api\/vod\/search/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "search-cache",
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60, // 1 minute fallback only
          },
          networkTimeoutSeconds: 5,
        },
      },
      // Images - long cache
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // Static assets - very long cache
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      // Fonts - very long cache
      {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warnings should not fail the build
    ignoreDuringBuilds: true,
  },
  images: {
    // WARNING: Allowing all domains is necessary for the VOD API which may return images from various CDNs.
    // In a stricter environment, replace this with a whitelist of specific domains.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  output: "standalone",
};

export default withPWA(nextConfig);
