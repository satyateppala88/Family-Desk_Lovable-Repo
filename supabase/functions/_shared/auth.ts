import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: { id: string; email?: string };
  supabase: ReturnType<typeof createClient>;
}

/**
 * Validates the Authorization header and returns the authenticated user.
 * Uses service role key for backend operations.
 * Returns null if auth fails (caller should return 401).
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthResult | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase credentials not configured");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return { user: { id: user.id, email: user.email }, supabase };
}

/**
 * Verifies user is a member of the specified household.
 */
export async function verifyHouseholdMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  householdId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}
