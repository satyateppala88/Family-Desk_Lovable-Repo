import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionConfig = {
  table: string;
  filter?: string;
  queryKeys: QueryKey[];
  enabled?: boolean;
};

export function useRealtimeSubscription(
  configs: SubscriptionConfig[],
  householdId?: string,
) {
  const queryClient = useQueryClient();
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
        () => { cfg.queryKeys.forEach(key =>
          queryClient.invalidateQueries({ queryKey: key })); }
      );
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, channelName, signature, queryClient]);
}
