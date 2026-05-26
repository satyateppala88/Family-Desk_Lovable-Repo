import { MutationCache, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { get, set, del, createStore, type UseStore } from "idb-keyval";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "@/lib/versioning";

// ---------------------------------------------------------------------------
// Persisted React Query client
// ---------------------------------------------------------------------------
// We persist successful query results into IndexedDB so the UI has data to
// render the moment the app boots — even if the device is offline. The
// service worker (vite-plugin-pwa) handles HTTP-level caching of the actual
// network responses; this layer handles in-memory React Query state.
//
// Persistence is safely disabled in iframe / Lovable preview contexts so it
// can never interfere with the editor experience.

const CACHE_KEY = "familydesk-rq-cache";
const CACHE_VERSION = `v1-${APP_VERSION}`;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
}

let store: UseStore | null = null;
function getStore(): UseStore {
  if (!store) store = createStore("familydesk", "react-query");
  return store;
}

export function createPersistedQueryClient(): QueryClient {
  const client = new QueryClient({
    // Global guard: when a mutation fails because the device is offline,
    // surface a single, clear toast instead of a cryptic network error.
    // Reads continue to work via the persisted cache + service worker.
    mutationCache: new MutationCache({
      onError: (error) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          toast.error("You're offline — reconnect to make changes.");
          return;
        }
        // Network errors thrown by fetch when no connection is available
        // sometimes arrive with the navigator already flipped back; check
        // for the canonical TypeError too.
        const msg = error instanceof Error ? error.message : "";
        if (/network|failed to fetch|load failed/i.test(msg) && !navigator.onLine) {
          toast.error("You're offline — reconnect to make changes.");
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Short freshness window so navigating between pages re-fetches
        // anything older than 30s. Realtime keeps things in sync between
        // updates; this is the safety net for missed events / cold tabs.
        staleTime: 30 * 1000,
        // Hold cached data for 7 days even after queries unmount so the
        // persister has something to write to disk.
        gcTime: MAX_AGE_MS,
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchOnWindowFocus: !Capacitor.isNativePlatform(),
        retry: 2,
      },
    },
  });

  if (isPreviewOrIframe()) {
    // No persistence in the editor preview — keeps it stateless and
    // avoids polluting the browser's IndexedDB with editor data.
    return client;
  }

  const persister = {
    persistClient: async (clientState: unknown) => {
      try {
        await set(CACHE_KEY, clientState, getStore());
      } catch {
        /* quota exceeded or storage unavailable — ignore */
      }
    },
    restoreClient: async () => {
      try {
        return (await get(CACHE_KEY, getStore())) ?? undefined;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(CACHE_KEY, getStore());
      } catch {
        /* ignore */
      }
    },
  };

  // Fire-and-forget — restoration happens asynchronously; queries will
  // hydrate as soon as the cache is read off disk. We don't block render.
  persistQueryClient({
    queryClient: client,
    persister,
    maxAge: MAX_AGE_MS,
    buster: CACHE_VERSION,
  });

  return client;
}