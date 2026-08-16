// Stage 2b.4-C3-G-c2 — Provider-Specific Reconciliation Policy (DESIGN & CHARACTERIZATION).
//
// This is a PURE decision function. It is deliberately NOT wired into the runtime reconcile() path in
// this stage — the application mapping in paymentRepository.ts is unchanged and checkpoint a4b7c7f stays
// frozen. It exists to fix the conceptual error that `not_found` was a universal payment fact: it is NOT.
// `not_found` is a PROVIDER CAPABILITY — "does absence of a record PROVE the operation never executed?"
//
//   - local_fake: authoritative in-memory store; absence PROVES non-execution → not_found may fail.
//   - Stripe: absence / no-id / ambiguous 404 does NOT prove non-execution (network + 500 are
//     indeterminate; there is no lookup-by-idempotency-key) → not_found must resolve to processing,
//     never a generic `failed`. Search is eventually consistent and must NEVER be a non-execution proof.
//   - Unknown/new provider: FAIL CLOSED → not_found → processing.
//
// The function never moves money and never triggers execute/re-POST/charge — it only classifies.

export type ProviderReconcileOutcome =
  | "accepted"
  | "declined"
  | "authentication_required"
  | "unknown"
  | "not_found";

// What the application should DO with a reconcile outcome. Only the two terminal_* dispositions may
// transition an attempt out of `processing`; the rest keep it safely indeterminate.
export type ReconcileDisposition =
  | "terminal_accepted"
  | "terminal_declined"
  | "remain_processing"
  | "manual_or_webhook_required";

export type ProviderReconcilePolicy = Readonly<{
  providerId: string;
  // Does provider ABSENCE (not_found) PROVE the operation never executed? Almost always false for a
  // real payment provider. True only for an authoritative store like local_fake.
  absenceProvesNonExecution: boolean;
  // May the adapter resolve status by reading a durable provider reference (retrieve-by-id)?
  supportsReadByReference: boolean;
}>;

export const LOCAL_FAKE_RECONCILE_POLICY: ProviderReconcilePolicy = Object.freeze({
  providerId: "local_fake",
  absenceProvesNonExecution: true,
  supportsReadByReference: true
});

export const STRIPE_RECONCILE_POLICY: ProviderReconcilePolicy = Object.freeze({
  providerId: "stripe_test",
  absenceProvesNonExecution: false, // Stripe absence is NOT proof of non-execution
  supportsReadByReference: true // retrieve PaymentIntent / Refund BY ID only
});

// FAIL-CLOSED default for any provider not explicitly characterized. A generic adapter must NEVER
// inherit `not_found → failed`.
export function defaultReconcilePolicy(providerId: string): ProviderReconcilePolicy {
  return Object.freeze({ providerId, absenceProvesNonExecution: false, supportsReadByReference: false });
}

const KNOWN_POLICIES: Readonly<Record<string, ProviderReconcilePolicy>> = Object.freeze({
  [LOCAL_FAKE_RECONCILE_POLICY.providerId]: LOCAL_FAKE_RECONCILE_POLICY,
  [STRIPE_RECONCILE_POLICY.providerId]: STRIPE_RECONCILE_POLICY
});

export function reconcilePolicyFor(providerId: string): ProviderReconcilePolicy {
  return KNOWN_POLICIES[providerId] ?? defaultReconcilePolicy(providerId);
}

// The pure decision. `hasDurableReference` = did we persist an authoritative provider id for THIS
// operation (e.g. an authorization/PaymentIntent id)? It distinguishes "ambiguous 404 on an id we hold"
// (remain processing) from "no id was ever captured" (manual/webhook required).
export function resolveReconcileDisposition(input: {
  policy: ProviderReconcilePolicy;
  outcome: ProviderReconcileOutcome;
  hasDurableReference: boolean;
}): ReconcileDisposition {
  const { policy, outcome, hasDurableReference } = input;
  switch (outcome) {
    case "accepted":
      return "terminal_accepted";
    case "declined":
      return "terminal_declined";
    case "authentication_required":
    case "unknown":
      // Indeterminate / pending / network / 5xx / auth / rate-limit all arrive here as `unknown`.
      return "remain_processing";
    case "not_found":
      if (policy.absenceProvesNonExecution) return "terminal_declined"; // authoritative absence only
      // Ambiguous absence for a non-authoritative provider NEVER terminalizes.
      return hasDurableReference ? "remain_processing" : "manual_or_webhook_required";
    default: {
      // Exhaustiveness guard — an unmodelled outcome must fail closed to processing.
      const _never: never = outcome;
      void _never;
      return "remain_processing";
    }
  }
}
