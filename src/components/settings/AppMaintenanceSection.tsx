import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wrench, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clearPersistedQueryCache } from "@/lib/query-client";

/**
 * Two recovery actions for when the app feels stale:
 *   - "Refresh data" — re-fetches every query, keeps the session.
 *   - "Hard reload" — clears service worker + caches + persisted query
 *     store, then reloads. Last-resort fix after a buggy release.
 */
export const AppMaintenanceSection = () => {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloading, setReloading] = useState(false);

  const handleRefreshData = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const id = toast.loading("Refreshing your data…");
    try {
      queryClient.clear();
      await queryClient.invalidateQueries();
      toast.success("All up to date.", { id });
    } catch {
      toast.error("Couldn't refresh — please try again.", { id });
    } finally {
      setRefreshing(false);
    }
  };

  const handleHardReload = async () => {
    setConfirmOpen(false);
    setReloading(true);
    toast.loading("Clearing app cache…", { id: "hard-reload" });
    try {
      // 1. Unregister all service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      }
      // 2. Clear HTTP caches
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      }
      // 3. Clear persisted React Query store
      await clearPersistedQueryCache();
    } catch {
      /* fall through to reload anyway */
    }
    // 4. Cache-busting reload
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            App maintenance
          </CardTitle>
          <CardDescription>
            Use these if something looks stale or out of date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Refresh data</p>
                <p className="text-xs text-muted-foreground">
                  Re-fetch the latest from the server without signing you out.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefreshData}
                disabled={refreshing}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh data"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Hard reload</p>
                <p className="text-xs text-muted-foreground">
                  Clears cached files and reloads. Fixes most "stuck screen" issues after an update. You'll stay signed in.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                disabled={reloading}
                className="w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Zap className="h-4 w-4 mr-2" />
                {reloading ? "Reloading…" : "Hard reload"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hard reload the app?"
        description="This clears cached files and reloads Family Desk. You'll stay signed in."
        confirmLabel="Reload now"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleHardReload}
      />
    </>
  );
};