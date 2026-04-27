import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { autoBumpVersion } from "./scripts/auto-bump-version";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    autoBumpVersion(),
    VitePWA({
      registerType: "autoUpdate",
      // Lovable previews live inside iframes; an active service worker
      // would cache the built bundle and break hot-reload + navigation.
      // Keep the SW disabled in dev — it only ships in production builds
      // (familydesk.in / familydesk.lovable.app).
      devOptions: {
        enabled: false,
      },
      includeAssets: ["pwa-icon-192.png", "pwa-icon-512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth\/callback/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime caching for offline support. Mutating verbs (POST/PATCH/
        // DELETE/PUT) are NEVER cached — they bypass these handlers and
        // surface a real network failure when offline, so the UI's
        // useOnlineGuard can show a clear "you're offline" toast.
        runtimeCaching: [
          {
            // Supabase REST GETs — last-seen data for tasks, meals, etc.
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/rest/v1/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-rest-get",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Edge function GETs — short-lived
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/functions/v1/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-edge-get",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Family Desk",
        short_name: "FamilyDesk",
        description: "Smart household management — tasks, meals, groceries, habits, finance & more.",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query"],
  },
}));
