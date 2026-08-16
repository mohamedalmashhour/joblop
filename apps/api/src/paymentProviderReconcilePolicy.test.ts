import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LOCAL_FAKE_RECONCILE_POLICY,
  STRIPE_RECONCILE_POLICY,
  defaultReconcilePolicy,
  reconcilePolicyFor,
  resolveReconcileDisposition,
  type ProviderReconcileOutcome
} from "./paymentProviderReconcilePolicy";

// Stage 2b.4-C3-G-c2 — characterizes the provider-specific reconciliation policy. Pure decisions only;
// the runtime reconcile() path in paymentRepository.ts is intentionally NOT wired to this yet.
const disp = (
  policy: Parameters<typeof resolveReconcileDisposition>[0]["policy"],
  outcome: ProviderReconcileOutcome,
  hasDurableReference = false
) => resolveReconcileDisposition({ policy, outcome, hasDurableReference });

describe("provider-specific reconciliation policy (Stage 2b.4-C3-G-c2)", () => {
  it("[1] local_fake not_found MAY terminalize to failed (authoritative absence)", () => {
    expect(LOCAL_FAKE_RECONCILE_POLICY.absenceProvesNonExecution).toBe(true);
    expect(disp(LOCAL_FAKE_RECONCILE_POLICY, "not_found", false)).toBe("terminal_declined");
    expect(disp(LOCAL_FAKE_RECONCILE_POLICY, "not_found", true)).toBe("terminal_declined");
  });

  it("[2] Stripe with NO provider reference remains processing (manual/webhook required, never failed)", () => {
    const d = disp(STRIPE_RECONCILE_POLICY, "not_found", /* hasDurableReference */ false);
    expect(d).toBe("manual_or_webhook_required");
    expect(d).not.toBe("terminal_declined"); // must NOT become failed
  });

  it("[3] Stripe ambiguous 404 on an id we HOLD remains processing (never failed)", () => {
    const d = disp(STRIPE_RECONCILE_POLICY, "not_found", /* hasDurableReference */ true);
    expect(d).toBe("remain_processing");
    expect(d).not.toBe("terminal_declined");
  });

  it("[4] Stripe network / 5xx / auth / rate-limit (all arrive as unknown) remain processing", () => {
    for (const ref of [true, false]) {
      expect(disp(STRIPE_RECONCILE_POLICY, "unknown", ref)).toBe("remain_processing");
      expect(disp(STRIPE_RECONCILE_POLICY, "authentication_required", ref)).toBe("remain_processing");
    }
  });

  it("[5] an unknown / new provider defaults FAIL-CLOSED: not_found never terminalizes", () => {
    const generic = defaultReconcilePolicy("some_new_provider");
    expect(generic.absenceProvesNonExecution).toBe(false);
    expect(reconcilePolicyFor("some_new_provider").absenceProvesNonExecution).toBe(false); // registry fail-closed
    expect(disp(generic, "not_found", false)).toBe("manual_or_webhook_required");
    expect(disp(generic, "not_found", true)).toBe("remain_processing");
  });

  it("[6] positive authoritative Stripe states (succeeded/canceled/declined) with an id may map terminally", () => {
    // The adapter maps a retrieved PaymentIntent status to accepted/declined; the policy lets those
    // terminalize because they are positive authoritative signals, not absence.
    expect(disp(STRIPE_RECONCILE_POLICY, "accepted", true)).toBe("terminal_accepted");
    expect(disp(STRIPE_RECONCILE_POLICY, "declined", true)).toBe("terminal_declined");
  });

  it("[7] a Search-result absence can NEVER terminalize", () => {
    // CONTRACT: the adapter MUST translate an eventually-consistent Search miss to `unknown` (never
    // `not_found`). Both routes are proven non-terminal here: unknown → processing, and even if a
    // Search miss were mis-labelled not_found, Stripe's non-authoritative policy still refuses to fail.
    expect(disp(STRIPE_RECONCILE_POLICY, "unknown", false)).toBe("remain_processing"); // correct mapping
    expect(disp(STRIPE_RECONCILE_POLICY, "not_found", false)).not.toBe("terminal_declined"); // defense-in-depth
    expect(disp(STRIPE_RECONCILE_POLICY, "not_found", true)).not.toBe("terminal_declined");
  });

  it("[8] the policy is PURE — no execute/re-POST/charge/provider handle reachable", () => {
    const src = readFileSync(fileURLToPath(new URL("./paymentProviderReconcilePolicy.ts", import.meta.url)), "utf8");
    // Match actual call/side-effect SYNTAX, not the words "execution"/"non-execution" in the prose.
    expect(src).not.toMatch(/\bexecute\(|\bcapture\(|\brefund\(|\bauthorize\(|\.create\(|\bcharge\(|\bfetch\(|\$queryRaw|\bprisma\b/i);
    // The exported decision takes only data (policy + outcome + boolean) — no side-effecting dependency.
    expect(resolveReconcileDisposition.length).toBe(1);
  });

  it("[9] runtime reconcile() keeps its version/state + webhook-race guards AND the policy is now wired (G-c3)", () => {
    // The optimistic guard and deterministic webhook-race reference remain intact; and the provider-
    // AGNOSTIC `not_found → declined` branch has been REPLACED by the provider-specific policy.
    const repo = readFileSync(fileURLToPath(new URL("./paymentRepository.ts", import.meta.url)), "utf8");
    expect(repo).toContain('version: current.version, state: "processing"'); // optimistic version+state guard
    expect(repo).toContain("reconcile:${startEventId}"); // deterministic webhook-vs-reconcile reference
    expect(repo).not.toContain('reconciled.outcome === "not_found" ? "declined"'); // old universal branch GONE
    expect(repo).toContain("resolveReconcileDisposition"); // provider-specific policy wired in
  });
});
