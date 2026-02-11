import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("ai-chat: returns 401 without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hello" }],
      householdId: "test",
      userId: "test",
    }),
  });
  const body = await response.text();
  assertEquals(response.status >= 400, true, `Expected 4xx, got ${response.status}: ${body}`);
});

Deno.test("ai-chat: endpoint is reachable", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();
  // CORS preflight should succeed
  assertEquals(response.status <= 204, true, `Expected 2xx, got ${response.status}: ${body}`);
});
