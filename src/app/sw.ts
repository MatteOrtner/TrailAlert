/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { type PrecacheEntry, Serwist, CacheFirst, NetworkFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Cache the map tiles for offline availability (up to 30 days)
    {
      matcher: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
      handler: new CacheFirst({
        cacheName: "map-tiles-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1500, // generous amount of tiles for mountain areas
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          }),
        ],
      }),
    },
    // 2. Cache the active closures JSON from Supabase, so the map loads offline
    {
      matcher: /^https:\/\/.*\.supabase\.co\/rest\/v1\/closures/i,
      handler: new NetworkFirst({
        cacheName: "supabase-closures-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours fallback
          }),
        ],
      }),
    },
    // 3. Fallback to default Next.js asset caching
    ...defaultCache,
  ],
});

serwist.addEventListeners();
