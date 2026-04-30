import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getHasSeenFeatureTour,
  setHasSeenFeatureTour,
  clearHasSeenFeatureTour,
} from "@/lib/launchStorage";

/**
 * Single source of truth for whether to show the welcome feature tour.
 * - Pre-auth: relies on localStorage flag.
 * - Post-auth: also checks `profiles.completed_tours.feature_tour` and
 *   back-fills localStorage so cross-device sign-in suppresses replay.
 */
export const useFeatureTourGate = () => {
  const { user, loading } = useAuth();
  const [shouldShow, setShouldShow] = useState<boolean>(!getHasSeenFeatureTour());
  const [resolved, setResolved] = useState<boolean>(!user);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    if (!user) {
      setShouldShow(!getHasSeenFeatureTour());
      setResolved(true);
      return;
    }

    // Authenticated — consult DB and reconcile with localStorage.
    supabase
      .from("profiles")
      .select("completed_tours")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const tours = (data?.completed_tours ?? {}) as Record<string, unknown>;
        const dbSeen = Boolean(tours["feature_tour"]);
        if (dbSeen) setHasSeenFeatureTour();
        setShouldShow(!dbSeen && !getHasSeenFeatureTour());
        setResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const markComplete = useCallback(async () => {
    setHasSeenFeatureTour();
    setShouldShow(false);
    if (user) {
      try {
        await supabase.rpc("update_completed_tour", { _key: "feature_tour" });
      } catch {
        /* non-blocking */
      }
    }
  }, [user]);

  const reset = useCallback(() => {
    clearHasSeenFeatureTour();
    setShouldShow(true);
  }, []);

  return { shouldShow, resolved, markComplete, reset };
};