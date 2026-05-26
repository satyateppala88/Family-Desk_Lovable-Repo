import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SubscriptionConfig = {
  table: string;
  filter?: string;
  queryKeys: QueryKey[];
  enabled?: boolean;
};

// Track the last time the current session wrote to a given table.
// Mutations that perform optimistic updates can call markSelfWrite(table)
// from their onMutate so the matching realtime echo is suppressed
// (the cache is already correct, an extra GET would be wasted work).
const SELF_WRITE_WINDOW_MS = 2000;
const selfWriteTimestamps = new Map<string, number>();
export function markSelfWrite(table: string) {
  selfWriteTimestamps.set(table, Date.now());
}

export function useRealtimeSubscription(
  configs: SubscriptionConfig[],
  householdId?: string | null,
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const active = configs.filter(c => c.enabled !== false);
  const sortedTables = active.map(c => c.table).sort();
  // Deterministic per-household channel name — prevents zombie channels
  // and duplicate topics when the same hook mounts on multiple pages.
  const channelName = `realtime-${householdId ?? "shared"}-${sortedTables.join("-")}`;
  const signature = JSON.stringify(
    configs.map(c => ({ table: c.table, filter: c.filter ?? null,
                        enabled: c.enabled ?? true }))
  );

  useEffect(() => {
    if (active.length === 0) return;

    let channel = supabase.channel(channelName);
    active.forEach(cfg => {
      channel = channel.on('postgres_changes' as any,
        { event: '*', schema: 'public', table: cfg.table,
          ...(cfg.filter ? { filter: cfg.filter } : {}) },
        (payload: any) => {
          const row = payload?.new ?? payload?.old;
          const authorId = row?.created_by ?? row?.user_id ?? row?.created_by_user_id;
          const ts = selfWriteTimestamps.get(cfg.table) ?? 0;
          const isOwnWrite =
            !!userId &&
            authorId === userId &&
            Date.now() - ts < SELF_WRITE_WINDOW_MS;
          if (isOwnWrite) return;
          cfg.queryKeys.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          );
        }
      );
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, channelName, signature, queryClient, userId]);
}
