import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("extract-calendar-tasks-preview: returns error without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-calendar-tasks-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      householdId: "test",
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    }),
  });
  const body = await response.text();
  assertEquals(response.status >= 400, true, `Expected 4xx, got ${response.status}: ${body}`);
});

Deno.test("extract-calendar-tasks-preview: CORS preflight succeeds", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-calendar-tasks-preview`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();
  assertEquals(response.status <= 204, true);
});
