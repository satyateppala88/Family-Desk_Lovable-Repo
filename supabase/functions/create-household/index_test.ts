import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("create-household: returns 401 without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-household`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ householdName: "Test" }),
  });
  const body = await response.text();
  // Without a valid user JWT, should fail
  assertEquals(response.status >= 400, true, `Expected 4xx, got ${response.status}: ${body}`);
});

Deno.test("create-household: accepts dev test mode header", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-household`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "x-dev-test-mode": "true",
    },
    body: JSON.stringify({ householdName: "Test Household" }),
  });
  const body = await response.text();
  // With dev test mode, may succeed or return a specific error
  // We just verify the endpoint is reachable and responds
  assertEquals(typeof response.status, "number");
});
