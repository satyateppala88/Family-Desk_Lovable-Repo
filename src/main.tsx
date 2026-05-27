import { createRoot } from "react-dom/client";
import "./index.css";
import { rehydrateAuthStorage } from "@/integrations/native/auth-storage-bridge";
import { processExpiredPermissionReminds } from "@/lib/launchStorage";

// Clear any expired "Remind me in 7 days" permission timers so the
// contextual sheet can show again on the next relevant trigger.
try { processExpiredPermissionReminds(); } catch { /* ignore */ }

// ---------------------------------------------------------------------------
// Disable pinch-zoom + double-tap zoom (iOS Safari ignores viewport meta).
// ---------------------------------------------------------------------------
try {
  const preventGesture = (e: Event) => e.preventDefault();
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
} catch {
  /* non-browser */
}

// ---------------------------------------------------------------------------
// PWA / Service Worker safety net
// ---------------------------------------------------------------------------
// `vite-plugin-pwa` auto-registers a service worker in production builds.
// That's what we want on familydesk.in / familydesk.lovable.app, but it
// would be catastrophic if it ever ran inside the Lovable editor preview
// iframe (stale bundles, broken navigation, persistent cache pollution
// across editor sessions).
//
// Belt-and-braces: even though `devOptions.enabled = false` keeps the SW
// out of dev, a user might briefly visit the production domain in the
// same browser and have a registered SW that follows them back into the
// editor preview. So we *actively unregister* any SW that's running in
// an iframe or on a Lovable preview host.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access throws — assume we're framed.
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ((isPreviewHost || isInIframe) && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {
      /* SW API unavailable — nothing to clean up */
    });
}

// ---------------------------------------------------------------------------
// Chunk-load self-heal (stale-SW recovery)
// ---------------------------------------------------------------------------
// After a new deploy, devices with the previous service worker may still
// hold an HTML shell that references chunks that no longer exist. Vite then
// throws `ChunkLoadError` / "Failed to fetch dynamically imported module"
// when the user navigates to a lazy route — the page goes blank with no
// recovery. Listen globally, unregister any SW, clear all caches, and force
// a single hard reload. A sessionStorage flag guarantees we never loop.
try {
  const RELOAD_FLAG = "fd_chunk_reload";
  const isChunkLoadError = (msg: string) =>
    /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      msg,
    );

  const recover = async (reason: string) => {
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      // eslint-disable-next-line no-console
      console.warn("[chunk-recovery] hard reloading:", reason);
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  };

  // Clear the guard once we land on a fresh boot without errors.
  window.addEventListener("load", () => {
    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
  });

  window.addEventListener("error", (e) => {
    const msg = (e?.message || "") + " " + (e?.error?.message || "");
    if (isChunkLoadError(msg)) void recover(msg);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = e?.reason;
    const msg = typeof reason === "string" ? reason : reason?.message || "";
    if (isChunkLoadError(msg)) void recover(msg);
  });
} catch {
  /* non-browser */
}

// Record PWA install moment (analytics-only flag). The welcome tour itself is
// gated by `useFeatureTourGate`, which already plays once on first launch and
// will naturally play after install if the user hadn't visited the web app
// previously in this browser.
try {
  window.addEventListener("appinstalled", () => {
    try {
      localStorage.setItem("familydesk_pwa_installed_at", new Date().toISOString());
    } catch {
      /* ignore */
    }
  });
} catch {
  /* SSR / non-browser */
}

// On Capacitor native (iOS/Android) we must seed localStorage from the
// persistent Preferences/Keychain store BEFORE the Supabase client is
// imported — otherwise it boots with an empty session and signs the user
// out. On web this resolves immediately. We then dynamically import App
// so that the supabase client module is evaluated only after rehydration.
// Wrapped in an async IIFE to avoid top-level await, which esbuild cannot
// lower when combined with Vite's preload helper in the production build.
void (async () => {
  await rehydrateAuthStorage();
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(<App />);
})();
