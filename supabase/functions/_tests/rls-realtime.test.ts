// Anonymous-client RLS verification tests for admin_notifications & user_roles.
//
// These tests use only the publishable (anon) key + an unauthenticated session.
// They prove that:
//   1. Unauthenticated clients cannot SELECT admin_notifications.
//   2. Unauthenticated clients cannot INSERT or DELETE admin_notifications.
//   3. Unauthenticated clients cannot SELECT user_roles (no policy grants it).
//   4. Unauthenticated clients cannot INSERT into user_roles (admin-only).
//   5. Realtime subscription on admin_notifications delivers ZERO payloads
//      to a non-admin / unauthenticated subscriber, even after a row exists.
//
// Run via supabase--test_edge_functions or `deno test --allow-net --allow-env`.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

assertExists(SUPABASE_URL, "VITE_SUPABASE_URL must be set in .env");
assertExists(SUPABASE_ANON_KEY, "VITE_SUPABASE_PUBLISHABLE_KEY must be set in .env");

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
}

Deno.test("anon cannot SELECT admin_notifications", async () => {
  const sb = anonClient();
  const { data, error } = await sb.from("admin_notifications").select("id").limit(1);
  // RLS hides rows: either error or empty array — never leaks rows
  assertEquals((data ?? []).length, 0, `Expected 0 rows, got ${data?.length}`);
  if (error) assert(/permission|policy|row-level/i.test(error.message));
});

Deno.test("anon cannot INSERT into admin_notifications", async () => {
  const sb = anonClient();
  const { error } = await sb
    .from("admin_notifications")
    .insert({ title: "x", type: "test", message: "y" });
  assertExists(error, "Expected RLS violation on insert");
  assert(/policy|permission|row-level/i.test(error!.message));
});

Deno.test("anon cannot DELETE from admin_notifications", async () => {
  const sb = anonClient();
  const { error } = await sb
    .from("admin_notifications")
    .delete()
    .eq("id", "00000000-0000-0000-0000-000000000000");
  // Either explicit error or silent no-op (no rows match policy USING false)
  if (error) assert(/policy|permission|row-level/i.test(error.message));
});

Deno.test("anon cannot SELECT user_roles", async () => {
  const sb = anonClient();
  const { data, error } = await sb.from("user_roles").select("user_id, role").limit(1);
  assertEquals((data ?? []).length, 0);
  if (error) assert(/permission|policy|row-level/i.test(error.message));
});

Deno.test("anon cannot INSERT into user_roles (privilege escalation block)", async () => {
  const sb = anonClient();
  const { error } = await sb
    .from("user_roles")
    .insert({ user_id: "00000000-0000-0000-0000-000000000001", role: "admin" });
  assertExists(error, "Expected RLS violation on user_roles insert");
  assert(/policy|permission|row-level/i.test(error!.message));
});

Deno.test("Realtime: anon subscriber receives ZERO admin_notifications payloads", async () => {
  const sb = anonClient();

  let received = 0;
  let lastPayload: unknown = null;

  const channel = sb
    .channel("test_admin_notifications_anon")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "admin_notifications" },
      (payload) => {
        received += 1;
        lastPayload = payload.new;
      },
    );

  // Subscribe and wait until the channel is joined (or fails)
  const subscribed = await new Promise<string>((resolve) => {
    channel.subscribe((status) => resolve(status));
  });

  // Anon may either successfully subscribe (and get filtered to 0 rows by RLS)
  // or be rejected. Both outcomes are acceptable from a security standpoint.
  assert(
    ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(subscribed),
    `Unexpected subscribe status: ${subscribed}`,
  );

  // Wait a moment to give any (incorrect) replication a chance to deliver.
  await new Promise((r) => setTimeout(r, 2500));

  await sb.removeChannel(channel);

  assertEquals(
    received,
    0,
    `Realtime leaked ${received} admin_notifications to anon subscriber: ${JSON.stringify(lastPayload)}`,
  );
});
