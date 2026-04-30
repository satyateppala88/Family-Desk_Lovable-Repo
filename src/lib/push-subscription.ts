import { supabase } from "@/lib/supabase";

// Defense-in-depth: this module must never read VAPID material from the bundle.
// Vite inlines `import.meta.env.VITE_*` strings at build time, so a stray
// `VITE_VAPID_*` var would end up in the client JS. Fail fast at module load
// if any such var ever appears — VAPID keys must only live in Supabase secrets
// and only be read inside edge functions.
try {
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  if (env) {
    for (const key of Object.keys(env)) {
      if (/vapid/i.test(key)) {
        throw new Error(
          `[security] "${key}" must not be exposed to the client bundle. ` +
            "Move VAPID material to Supabase secrets and access it only from edge functions."
        );
      }
    }
  }
} catch (e) {
  if (e instanceof Error && e.message.startsWith("[security]")) throw e;
  // ignore — non-Vite runtime (tests, SSR) where import.meta.env is absent.
}

/**
 * Frontend Web Push subscription manager.
 *
 * Flow:
 *   1. Caller verifies `Notification.permission === "granted"`.
 *   2. `ensurePushSubscription()` fetches the VAPID public key from the
 *      `push-subscribe` edge function, calls `pushManager.subscribe`, and
 *      uploads the resulting endpoint + keys to the backend.
 *   3. The dedicated service worker (`/sw.js`) handles `push` events.
 *
 * Re-running `ensurePushSubscription` is safe — the backend upserts on the
 * endpoint URL, so identical subscriptions are de-duplicated.
 */

export type PushSetupResult =
  | { ok: true; endpoint: string; reused: boolean }
  | { ok: false; reason: PushSetupFailure };

export type PushSetupFailure =
  | "unsupported"
  | "permission-denied"
  | "no-service-worker"
  | "no-vapid-key"
  | "subscribe-failed"
  | "upload-failed";

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Convert the URL-safe base64 VAPID key into the Uint8Array PushManager wants. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function getVapidPublicKey(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("push-subscribe", {
    body: { action: "publicKey" },
  });
  if (error) {
    console.warn("[push] publicKey fetch failed", error);
    return null;
  }
  const key = (data as { vapidPublicKey?: string } | null)?.vapidPublicKey;
  return key && key.length > 0 ? key : null;
}

/**
 * Ensure the current device has a registered Web Push subscription owned by
 * the signed-in user. Idempotent — safe to call on every app start.
 */
export async function ensurePushSubscription(): Promise<PushSetupResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (Notification.permission !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  // Wait for the service worker to actually be ready. On Android Chrome the
  // SW registration can still be `installing` when the user taps Enable
  // immediately after permission, so `getRegistration()` returns the record
  // but `pushManager.subscribe` then fails with "no active Service Worker".
  // `navigator.serviceWorker.ready` resolves only once an active worker
  // controls the page.
  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 8000)),
    ]);
  } catch {
    registration = undefined;
  }
  if (!registration) {
    registration = await navigator.serviceWorker.getRegistration();
  }
  if (!registration || !registration.active) {
    return { ok: false, reason: "no-service-worker" };
  }

  // Reuse any existing subscription for this registration.
  let sub = await registration.pushManager.getSubscription();
  let reused = Boolean(sub);

  if (!sub) {
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) return { ok: false, reason: "no-vapid-key" };
    try {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey
        ) as unknown as BufferSource,
      });
    } catch (e) {
      console.warn("[push] subscribe failed", e);
      return { ok: false, reason: "subscribe-failed" };
    }
  }

  // Upload (upsert) the subscription to the backend.
  const json = sub.toJSON() as PushSubscriptionJSON;
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: {
      action: "subscribe",
      subscription: json,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
  });
  if (error) {
    console.warn("[push] upload failed", error);
    return { ok: false, reason: "upload-failed" };
  }

  return { ok: true, endpoint: sub.endpoint, reused };
}

/** Remove the current device's subscription locally and on the backend. */
export async function removePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return true;

  const endpoint = sub.endpoint;
  let unsubscribed = false;
  try {
    unsubscribed = await sub.unsubscribe();
  } catch (e) {
    console.warn("[push] unsubscribe failed locally", e);
  }

  await supabase.functions
    .invoke("push-subscribe", {
      body: { action: "unsubscribe", endpoint },
    })
    .catch((e) => console.warn("[push] backend unsubscribe failed", e));

  return unsubscribed;
}