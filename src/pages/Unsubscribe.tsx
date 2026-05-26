import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const resp = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (body?.valid === true) setState({ kind: "ready" });
        else if (body?.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    if ((data as any)?.success) setState({ kind: "done" });
    else if ((data as any)?.reason === "already_unsubscribed") setState({ kind: "already" });
    else setState({ kind: "error", message: "Unable to process unsubscribe." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </div>
          )}
          {state.kind === "ready" && (
            <>
              <p className="text-sm text-muted-foreground">
                You can stop receiving emails from Family Desk at this address. You'll still receive
                essential account and security messages.
              </p>
              <Button onClick={confirm} className="w-full">
                Confirm unsubscribe
              </Button>
            </>
          )}
          {state.kind === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating your preferences…
            </div>
          )}
          {state.kind === "done" && (
            <p className="text-sm">
              You've been unsubscribed. We're sorry to see you go.
            </p>
          )}
          {state.kind === "already" && (
            <p className="text-sm text-muted-foreground">
              This address is already unsubscribed. No further action needed.
            </p>
          )}
          {state.kind === "invalid" && (
            <p className="text-sm text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          )}
          {state.kind === "error" && (
            <p className="text-sm text-destructive">Something went wrong: {state.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}