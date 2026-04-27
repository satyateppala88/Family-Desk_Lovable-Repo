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
      // We ship a custom service worker (src/sw.ts) so we can handle Web
      // Push and notification clicks alongside Workbox's offline caching.
      // injectManifest tells the plugin to bundle our SW and inject the
      // precache manifest into it (`self.__WB_MANIFEST`).
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // Lovable previews live inside iframes; an active service worker
      // would cache the built bundle and break hot-reload + navigation.
      // Keep the SW disabled in dev — it only ships in production builds
      // (familydesk.in / familydesk.lovable.app).
      devOptions: {
        enabled: false,
      },
      includeAssets: ["pwa-icon-192.png", "pwa-icon-512.png"],
      // Runtime caching + push handlers live inside src/sw.ts. The only
      // build-time hint Workbox needs is which assets to precache.
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
