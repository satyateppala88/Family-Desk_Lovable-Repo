/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// FamilyDesk service worker (production only).
//
// Combines three responsibilities into one SW so browsers don't have to
// arbitrate between competing workers:
//   1. App-shell precaching (injected by vite-plugin-pwa via injectManifest).
//   2. Runtime caching for offline support (matches the rules previously in
//      vite.config.ts workbox.runtimeCaching).
//   3. Web Push: receive push events, show notifications, route clicks.
//
// This file is bundled by Vite, NOT shipped as raw JS. `self` is the
// ServiceWorkerGlobalScope.
// ---------------------------------------------------------------------------

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ---------------------------------------------------------------------------
// 1. Precache the app shell (injected at build time)
// ---------------------------------------------------------------------------
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------------
// 2. Runtime caching for offline reads
//    Mutating verbs are NEVER cached — they fall through to the network.
// ---------------------------------------------------------------------------
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/rest/v1/"),
  new StaleWhileRevalidate({
    cacheName: "supabase-rest-get",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
);

registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/functions/v1/"),
  new NetworkFirst({
    cacheName: "supabase-edge-get",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "google-fonts-css" })
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-files",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

// ---------------------------------------------------------------------------
// 3. Lifecycle: take control fast so updated SWs apply on next navigation.
// ---------------------------------------------------------------------------
self.addEventListener("install", () => {
  // Activate immediately on next load instead of waiting for all tabs to close.
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ---------------------------------------------------------------------------
// 4. Web Push handlers
// ---------------------------------------------------------------------------

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  // Free-form extra data echoed back to the page on click.
  data?: Record<string, unknown>;
};

function parsePushData(event: PushEvent): PushPayload {
  if (!event.data) return {};
  try {
    return event.data.json() as PushPayload;
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushData(event);

  const title = payload.title || "FamilyDesk";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: payload.icon || "/pwa-icon-192.png",
    badge: payload.badge || "/pwa-icon-192.png",
    tag: payload.tag, // collapses repeated notifications of the same kind
    // Vibration pattern hint (Android only).
    ...(({ vibrate: [60, 30, 60] } as any)),
    data: {
      url: payload.url || "/",
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = (event.notification.data || {}) as { url?: string };
  const targetPath = data.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const targetUrl = new URL(targetPath, self.registration.scope).href;

      // Prefer focusing an existing tab on the target URL.
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          const wantUrl = new URL(targetUrl);
          if (clientUrl.origin === wantUrl.origin) {
            await client.focus();
            // Best-effort navigation if it's not already on the path.
            if (clientUrl.pathname !== wantUrl.pathname) {
              if ("navigate" in client) {
                try {
                  await (client as WindowClient).navigate(targetUrl);
                } catch {
                  /* cross-origin or navigation refused — ignore */
                }
              }
            }
            return;
          }
        } catch {
          /* malformed URL — try next client */
        }
      }

      // No matching tab — open a new one.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Optional: track dismissals for future analytics.
self.addEventListener("notificationclose", () => {
  /* no-op */
});

// ---------------------------------------------------------------------------
// 5. Page → SW messaging (e.g. for forced updates)
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

export {};