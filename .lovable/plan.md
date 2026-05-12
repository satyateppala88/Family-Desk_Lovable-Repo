## Replace `src/hooks/useRealtimeSubscription.ts`

Overwrite the entire file with the new implementation that:

- Computes a stable signature from `configs` (table, filter, enabled).
- Derives a deterministic channel name via a 32-bit hash, eliminating `Math.random()` zombie channels across rerenders.
- Subscribes to all enabled configs on a single channel; invalidates the listed `queryKeys` on any change.
- Re-subscribes only when the signature or `queryClient` changes.

No other files are modified. The public API (`useRealtimeSubscription(configs)`) and `SubscriptionConfig` shape are unchanged, so existing call sites continue to work.