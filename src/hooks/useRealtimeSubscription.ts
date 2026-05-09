import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SubscriptionConfig = {
  table: string;
  /** Optional Postgres-style filter, e.g. `household_id=eq.<uuid>`. */
  filter?: string;
  /** React-Query keys to invalidate when any change is received. */
  queryKeys: QueryKey[];
  /** Skip subscribing when not ready (e.g. household not loaded yet). */
  enabled?: boolean;
};

const isDev =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

/**
 * Subscribe to one or more Postgres tables and invalidate React-Query caches
 * on any insert/update/delete so all household members see live updates.
 */
export function useRealtimeSubscription(configs: SubscriptionConfig[]) {
  const queryClient = useQueryClient();

  // Stable signature for re-subscribing only when configs meaningfully change.
  const signature = JSON.stringify(
    configs.map((c) => ({
      table: c.table,
      filter: c.filter ?? null,
      enabled: c.enabled ?? true,
    }))
  );

  useEffect(() => {
    const active = configs.filter((c) => c.enabled !== false);
    if (active.length === 0) return;

    const channelName = `realtime-${active.map((c) => c.table).join("-")}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    let channel = supabase.channel(channelName);

    active.forEach((cfg) => {
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: cfg.table,
          ...(cfg.filter ? { filter: cfg.filter } : {}),
        },
        () => {
          cfg.queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe((status, err) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.debug(`[realtime] ${channelName} → ${status}`, err ?? "");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // eslint-disable-next-line no-console
        console.warn(`[realtime] ${channelName} ${status}`, err ?? "");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, queryClient]);
}