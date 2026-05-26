import { supabase } from "@/integrations/supabase/client";
import type { PermissionKind } from "@/lib/permissions";

/**
 * Outcomes we record for permission prompts.
 *
 * - prompted   — soft primer was shown to the user
 * - granted    — OS-level permission was granted
 * - denied     — OS-level prompt was shown and denied
 * - dismissed  — user tapped "Not now" on our soft primer (no OS prompt)
 * - blocked    — capability was already blocked at the OS level (no prompt
 *                surfaced); recorded once per session per capability
 */
export type PermissionOutcome =
  | "prompted"
  | "granted"
  | "denied"
  | "dismissed"
  | "blocked";

const isNative = (): boolean =>
  typeof window !== "undefined" &&
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();

/**
 * Fire-and-forget logger for permission prompt outcomes. Never throws and
 * never blocks the caller — analytics must not affect UX.
 */
export const logPermissionEvent = async (
  capability: PermissionKind,
  outcome: PermissionOutcome,
  surface: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Anonymous → don't log (RLS would reject anyway)

    await supabase.from("permission_events").insert([
      {
        user_id: user.id,
        capability,
        outcome,
        surface: surface || "unknown",
        platform: isNative() ? "native" : "web",
        metadata: metadata as never,
      },
    ]);
  } catch (err) {
    // Swallow — analytics must never break the app.
    console.warn("[permission-analytics] log failed:", err);
  }
};