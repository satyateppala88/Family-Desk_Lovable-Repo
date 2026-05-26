import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushNotifications";

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported = isPushSupported();
    setIsSupported(supported);
    if (!supported) return;
    setPermission(Notification.permission);
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    })();
  }, []);

  const persistSubscription = useCallback(async (sub: PushSubscription) => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    const json = sub.toJSON() as PushSubscriptionJSON;
    const p256dh = json.keys?.p256dh ?? "";
    const authKey = json.keys?.auth ?? "";
    const deviceType = detectDeviceType();
    const userAgent =
      typeof navigator !== "undefined"
        ? `[${deviceType}] ${navigator.userAgent}`
        : `[${deviceType}]`;

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth: authKey,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
  }, []);

  const subscribe = useCallback(async () => {
    if (!isPushSupported()) return false;
    const sub = await subscribeToPush();
    setPermission(Notification.permission);
    if (!sub) {
      setIsSubscribed(false);
      return false;
    }
    await persistSubscription(sub);
    setIsSubscribed(true);
    return true;
  }, [persistSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const endpoint = sub?.endpoint;
    const ok = await unsubscribeFromPush();
    if (endpoint) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    if (ok) setIsSubscribed(false);
    return ok;
  }, []);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe };
}