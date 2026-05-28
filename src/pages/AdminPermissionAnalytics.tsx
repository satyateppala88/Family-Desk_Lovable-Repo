import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, ArrowLeft, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsPlatformAdmin } from "@/hooks/useIsPlatformAdmin";

type DailyRow = {
  day: string;
  capability: "microphone" | "camera" | "photos" | "notifications";
  outcome: "granted" | "denied" | "dismissed" | "blocked" | "prompted";
  surface: string;
  platform: "web" | "native" | "unknown";
  event_count: number;
  unique_users: number;
};

const RANGES = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
] as const;

const CAPABILITIES = ["microphone", "camera", "photos", "notifications"] as const;
const OUTCOMES = ["prompted", "granted", "denied", "dismissed", "blocked"] as const;

const OUTCOME_TONE: Record<string, string> = {
  granted: "text-emerald-700 dark:text-emerald-300",
  denied: "text-destructive",
  dismissed: "text-amber-700 dark:text-amber-300",
  blocked: "text-destructive",
  prompted: "text-muted-foreground",
};

const AdminPermissionAnalytics = () => {
  const navigate = useNavigate();
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const [days, setDays] = useState<number>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["permission-events-daily", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("permission_events_daily")
        .select("*")
        .gte("day", since.toISOString().slice(0, 10))
        .order("day", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyRow[];
    },
    enabled: isPlatformAdmin,
    staleTime: 60_000,
  });

  // Aggregate per capability × outcome
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const cap of CAPABILITIES) {
      m[cap] = {};
      for (const o of OUTCOMES) m[cap][o] = 0;
    }
    for (const row of data ?? []) {
      if (!m[row.capability]) continue;
      m[row.capability][row.outcome] = (m[row.capability][row.outcome] ?? 0) + Number(row.event_count);
    }
    return m;
  }, [data]);

  // Surface breakdown
  const bySurface = useMemo(() => {
    const m: Record<string, { prompted: number; granted: number; denied: number; dismissed: number; blocked: number }> = {};
    for (const row of data ?? []) {
      if (!m[row.surface]) m[row.surface] = { prompted: 0, granted: 0, denied: 0, dismissed: 0, blocked: 0 };
      m[row.surface][row.outcome] = (m[row.surface][row.outcome] ?? 0) + Number(row.event_count);
    }
    return Object.entries(m).sort((a, b) => {
      const ta = Object.values(a[1]).reduce((s, n) => s + n, 0);
      const tb = Object.values(b[1]).reduce((s, n) => s + n, 0);
      return tb - ta;
    });
  }, [data]);

  if (roleLoading) {
    return (
      <>
        <Header />
        <main className="page-content">
          <Skeleton className="h-96 w-full" />
        </main>
      </>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <>
        <Header />
        <main className="page-content">
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">Restricted</p>
              <p className="text-sm text-muted-foreground mt-1">
                This page is only available to platform administrators.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="fd-eyebrow mb-0.5">ADMIN</div>
                <h1 className="fd-display text-[24px] text-fd-ink flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Permission Analytics
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  How users are responding to mic, camera, photos, and notification prompts.
                </p>
              </div>
            </div>

            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <TabsList>
                {RANGES.map((r) => (
                  <TabsTrigger key={r.value} value={String(r.value)}>
                    {r.value}d
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By capability</CardTitle>
              <CardDescription>
                Total events by outcome over the selected window. "Prompted" = our soft primer was shown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Capability</TableHead>
                        {OUTCOMES.map((o) => (
                          <TableHead key={o} className="text-right capitalize">
                            {o}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Grant rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CAPABILITIES.map((cap) => {
                        const row = matrix[cap];
                        const decisions = row.granted + row.denied;
                        const grantRate = decisions > 0 ? Math.round((row.granted / decisions) * 100) : null;
                        return (
                          <TableRow key={cap}>
                            <TableCell className="font-medium capitalize">{cap}</TableCell>
                            {OUTCOMES.map((o) => (
                              <TableCell key={o} className={`text-right tabular-nums ${OUTCOME_TONE[o] ?? ""}`}>
                                {row[o].toLocaleString()}
                              </TableCell>
                            ))}
                            <TableCell className="text-right tabular-nums font-medium">
                              {grantRate === null ? "—" : `${grantRate}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By surface</CardTitle>
              <CardDescription>
                Where the prompt appeared (e.g. onboarding tutorial vs. inline voice button).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : bySurface.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No events in this window yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Surface</TableHead>
                        {OUTCOMES.map((o) => (
                          <TableHead key={o} className="text-right capitalize">
                            {o}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bySurface.map(([surface, counts]) => (
                        <TableRow key={surface}>
                          <TableCell className="font-medium">{surface}</TableCell>
                          {OUTCOMES.map((o) => (
                            <TableCell key={o} className={`text-right tabular-nums ${OUTCOME_TONE[o] ?? ""}`}>
                              {(counts[o] ?? 0).toLocaleString()}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily detail</CardTitle>
              <CardDescription>Latest 100 daily rollups, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No events recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Capability</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Surface</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead className="text-right">Users</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data ?? []).slice(0, 100).map((r, i) => (
                        <TableRow key={`${r.day}-${r.capability}-${r.outcome}-${r.surface}-${r.platform}-${i}`}>
                          <TableCell className="tabular-nums">{r.day}</TableCell>
                          <TableCell className="capitalize">{r.capability}</TableCell>
                          <TableCell className={`capitalize ${OUTCOME_TONE[r.outcome] ?? ""}`}>
                            {r.outcome}
                          </TableCell>
                          <TableCell>{r.surface}</TableCell>
                          <TableCell className="capitalize">{r.platform}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(r.event_count).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(r.unique_users).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default AdminPermissionAnalytics;