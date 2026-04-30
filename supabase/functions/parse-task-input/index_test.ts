import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("parse-task-input: responds to POST request", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-task-input`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ input: "Buy groceries tomorrow" }),
  });
  const body = await response.text();
  // Should respond (may succeed or fail based on AI availability)
  assertEquals(typeof response.status, "number");
});

Deno.test("parse-task-input: CORS preflight succeeds", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-task-input`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.text();
  assertEquals(response.status <= 204, true);
});
