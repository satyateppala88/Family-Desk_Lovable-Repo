import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionConfig = {
  table: string;
  filter?: string;
  queryKeys: QueryKey[];
  enabled?: boolean;
};

export function useRealtimeSubscription(configs: SubscriptionConfig[]) {
  const queryClient = useQueryClient();
  const signature = JSON.stringify(
    configs.map(c => ({ table: c.table, filter: c.filter ?? null,
                        enabled: c.enabled ?? true }))
  );

  useEffect(() => {
    const active = configs.filter(c => c.enabled !== false);
    if (active.length === 0) return;

    // Deterministic hash — replaces Math.random() zombie channels
    const hash = Array.from(signature).reduce(
      (acc, char) => (Math.imul(31, acc) + char.charCodeAt(0)) | 0, 0
    );
    const channelName = `realtime-${Math.abs(hash).toString(36)}`;

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
  }, [signature, queryClient]);
}
