import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
