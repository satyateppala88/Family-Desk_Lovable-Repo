import { useCallback } from "react";
import { toast } from "@/components/ui/sonner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Wraps a mutating callback so it short-circuits with a clear toast when
 * the device is offline. Use this on Add / Edit / Delete / Toggle handlers
 * across the app. Read-only data continues to work because it comes from
 * the persisted React Query cache + service worker.
 *
 * Example:
 *   const guardedAdd = useOnlineGuard(addTask);
 *   <Button onClick={() => guardedAdd(payload)} disabled={!isOnline} />
 */
export function useOnlineGuard<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  message = "You're offline — reconnect to make changes."
): (...args: TArgs) => TReturn | void {
  const { isOnline } = useOnlineStatus();

  return useCallback(
    (...args: TArgs) => {
      if (!isOnline) {
        toast.error(message);
        return;
      }
      return fn(...args);
    },
    [fn, isOnline, message]
  );
}