// ---------------------------------------------------------------------------
// SECURITY REGRESSION TESTS — cross-event payment idempotency
//
// A single Paystack reference can be observed by THREE independent crediting
// paths: verify-payment, verify-charge, and paystack-webhook. The contract is
// that tokens are credited AT MOST ONCE per reference across all paths, even
// when paths race or fire repeatedly. These tests pin the decision function
// (`evaluateIdempotency`) and simulate every realistic ordering of events
// against an in-memory `processed_payments` table to prove no scenario can
// double-credit.
// ---------------------------------------------------------------------------
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateIdempotency } from "../payment-core.ts";

type Path = "verify-payment" | "verify-charge" | "webhook:charge.success";

// In-memory simulator for the (reference, event_type) unique constraint on
// processed_payments. Mirrors the real DB: same (reference, event_type) =>
// "23505" unique violation; otherwise insert succeeds.
function makeProcessedPaymentsTable() {
  const rows: Array<{ reference: string; event_type: string }> = [];
  return {
    rows,
    listForReference(reference: string) {
      return rows.filter((r) => r.reference === reference);
    },
    tryInsert(reference: string, event_type: string): { code: string | null } {
      if (rows.some((r) => r.reference === reference && r.event_type === event_type)) {
        return { code: "23505" };
      }
      rows.push({ reference, event_type });
      return { code: null };
    },
  };
}

// Drive one crediting path against the table and return whether tokens were
// credited this call. The order (read existing → try insert → decide) matches
// the production handlers in verify-charge / verify-payment / paystack-webhook.
function runPath(
  table: ReturnType<typeof makeProcessedPaymentsTable>,
  reference: string,
  path: Path,
  creditedCounter: { count: number },
): { credited: boolean; alreadyProcessed: boolean } {
  const existingRows = table.listForReference(reference);
  const insert = table.tryInsert(reference, path);
  const decision = evaluateIdempotency({
    existingRows,
    currentEventType: path,
    insertErrorCode: insert.code,
  });
  if (decision.shouldCredit) creditedCounter.count += 1;
  return { credited: decision.shouldCredit, alreadyProcessed: decision.alreadyProcessed };
}

// ---------------------------------------------------------------------------
// Pure decision tests
// ---------------------------------------------------------------------------

Deno.test("first observation of a reference credits exactly once", () => {
  const decision = evaluateIdempotency({
    existingRows: [],
    currentEventType: "verify-payment",
    insertErrorCode: null,
  });
  assertEquals(decision, { shouldCredit: true, alreadyProcessed: false });
});

Deno.test("same path firing twice never double-credits (unique violation)", () => {
  const decision = evaluateIdempotency({
    existingRows: [{ event_type: "verify-payment" }],
    currentEventType: "verify-payment",
    insertErrorCode: "23505",
  });
  assertEquals(decision, { shouldCredit: false, alreadyProcessed: true });
});

Deno.test("different path on already-credited reference records audit but does NOT credit", () => {
  const decision = evaluateIdempotency({
    existingRows: [{ event_type: "verify-payment" }],
    currentEventType: "webhook:charge.success",
    insertErrorCode: null,
  });
  assertEquals(decision, { shouldCredit: false, alreadyProcessed: false });
});

Deno.test("any prior row from any path blocks crediting", () => {
  for (const prior of ["verify-payment", "verify-charge", "webhook:charge.success", "webhook:invoice.payment_succeeded"]) {
    const decision = evaluateIdempotency({
      existingRows: [{ event_type: prior }],
      currentEventType: "verify-charge",
      insertErrorCode: null,
    });
    assertEquals(decision.shouldCredit, false, `prior=${prior} must block credit`);
  }
});

// ---------------------------------------------------------------------------
// Multi-path simulation tests — every realistic ordering across 3 paths
// ---------------------------------------------------------------------------

const ALL_PATHS: Path[] = ["verify-payment", "verify-charge", "webhook:charge.success"];

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

Deno.test("SECURITY: every ordering of 3 crediting paths credits exactly once", () => {
  for (const order of permutations(ALL_PATHS)) {
    const table = makeProcessedPaymentsTable();
    const counter = { count: 0 };
    const reference = `ref_${order.join("_")}`;
    for (const path of order) {
      runPath(table, reference, path, counter);
    }
    assertEquals(counter.count, 1, `order=${order.join(" → ")} credited ${counter.count} times`);
    // Each path should have inserted exactly one audit row.
    assertEquals(table.listForReference(reference).length, 3);
  }
});

Deno.test("SECURITY: each path retried multiple times still credits at most once", () => {
  for (const order of permutations(ALL_PATHS)) {
    const table = makeProcessedPaymentsTable();
    const counter = { count: 0 };
    const reference = `retry_${order.join("_")}`;
    // Each path fires 3 times in the chosen order.
    for (let i = 0; i < 3; i++) {
      for (const path of order) {
        runPath(table, reference, path, counter);
      }
    }
    assertEquals(counter.count, 1, `retried order=${order.join(" → ")} credited ${counter.count} times`);
  }
});

Deno.test("SECURITY: webhook fires N times alone — credits exactly once", () => {
  const table = makeProcessedPaymentsTable();
  const counter = { count: 0 };
  for (let i = 0; i < 10; i++) {
    const r = runPath(table, "ref_webhook_storm", "webhook:charge.success", counter);
    if (i === 0) {
      assertEquals(r.credited, true);
    } else {
      assertEquals(r.credited, false);
      assertEquals(r.alreadyProcessed, true);
    }
  }
  assertEquals(counter.count, 1);
});

Deno.test("SECURITY: distinct references are independent (no cross-contamination)", () => {
  const table = makeProcessedPaymentsTable();
  const counter = { count: 0 };
  runPath(table, "ref_A", "verify-payment", counter);
  runPath(table, "ref_B", "verify-payment", counter);
  runPath(table, "ref_C", "webhook:charge.success", counter);
  assertEquals(counter.count, 3);
});

Deno.test("SECURITY: invoice.payment_succeeded after charge.success on same reference does NOT re-credit", () => {
  // Realistic Paystack flow: charge.success then a follow-up invoice event for
  // the same subscription cycle. paystack-webhook treats them as distinct
  // event_types so both get audit rows, but only the first credits.
  const table = makeProcessedPaymentsTable();
  const counter = { count: 0 };
  const ref = "ref_subscription_cycle";
  const r1 = runPath(table, ref, "webhook:charge.success", counter);
  // Simulate the second webhook event with a different event_type.
  const existing = table.listForReference(ref);
  const insert = table.tryInsert(ref, "webhook:invoice.payment_succeeded");
  const decision = evaluateIdempotency({
    existingRows: existing,
    currentEventType: "webhook:invoice.payment_succeeded",
    insertErrorCode: insert.code,
  });
  if (decision.shouldCredit) counter.count += 1;

  assertEquals(r1.credited, true);
  assertEquals(decision.shouldCredit, false);
  assertEquals(counter.count, 1);
});
