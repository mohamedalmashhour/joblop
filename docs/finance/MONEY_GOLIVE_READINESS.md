# Money Go-Live Readiness — Stripe binding + reconciliation sweeper

**Status: BEHIND THE CLOSED FINANCE GATE. Money is OFF. Nothing in this change moves real money, and
no committed configuration opens the gate.**

This document describes two readiness pieces wired for a *future, controlled* money go-live, and the
manual steps that remain before any real transaction can occur. It complements
`TWO_CHANNEL_PAYROLL_DESIGN.md`, `EMPLOYER_INVOICE_STRIPE_TEST_COLLECTION.md`, and
`WORKER_PAYOUT_TEST_EXECUTION.md`.

## 1. Real Stripe provider bound into the payment path (gated)

Previously the payment repository hardcoded `createLocalFakePaymentProvider()`. The Stripe adapter
(`apps/api/src/stripeTestProvider.ts`) existed but was never bound to the repository at runtime.

Now the binding goes through a pure, tested selector — `apps/api/src/paymentProviderSelection.ts`:

```
REAL Stripe is used ONLY when BOTH hold:
  (a) the finance go-live gate is OPEN   (FINANCE_LIVE_ENABLED=enabled), AND
  (b) a complete Stripe test credential set is present
        (sk_test_ secret + whsec_ webhook secret + an approved acct_ reference).
Otherwise — gate closed, or any credential missing — the LOCAL FAKE provider is used.
```

Because the committed configuration never opens the gate, the **default path is always the local
fake, byte-for-byte unchanged**. The Stripe client is built lazily (only on the gated branch), and the
`createStripeTestClient` guard still rejects any non-`sk_test_` / live secret, so a misconfiguration
fails closed to the fake rather than touching a live key.

The repository-bound Stripe provider serves the `execute()` / `reconcile()` path only. Webhook
signature verification stays on the dedicated webhook route + recovery handler
(`stripeWebhookRoute.ts` / `stripeWebhookRecovery.ts`), which remains the **primary** resolver.

Tests: `paymentProviderSelection.test.ts` (gate off → fake; gate on + keys → stripe; gate on but
unconfigured → fake fail-closed; keys but gate off → fake).

## 2. Reconciliation sweeper — hardened adapter + runtime activation (gated/off)

The sweeper is a **backstop** behind webhook-first recovery. It finds aged `processing` payment
attempts and runs the query-only, version/state-guarded `PaymentRepository.reconcile()` on each. It
NEVER executes/charges and moves no money.

**(a) Hardened Stripe `reconcile()`** (`stripeTestProvider.ts`). The retrieve-by-id call is now wrapped
so every provider error is classified the same way `execute()` classifies indeterminacy, and a
provider-side failure can never terminalize a held payment to `failed`:

| Provider result on an id we hold          | Adapter outcome | Disposition (per policy)      |
|-------------------------------------------|-----------------|-------------------------------|
| PaymentIntent found (succeeded/…)         | accepted/declined | terminal (authoritative)    |
| `resource_missing` / HTTP 404             | `not_found`     | **remain processing** (Stripe absence ≠ non-execution) |
| 5xx / network / rate-limit / timeout      | `unknown`       | **remain processing**         |
| no PaymentIntent id was ever captured     | `not_found` (null ref) | **manual_or_webhook_required** |
| live-mode object                          | — (hard throw)  | test-only invariant preserved |

A Stripe Search miss is **never** used as a non-execution proof. The provider-specific policy lives in
`paymentProviderReconcilePolicy.ts` (`STRIPE_RECONCILE_POLICY.absenceProvesNonExecution = false`).

Tests: `stripeTestProvider.reconcile.test.ts` (adapter classification) and, end-to-end through
`paymentRepository.reconcile()`, the "REAL Stripe adapter reconcile → disposition" block in
`paymentRepository.test.ts` (resource_missing on a held id → stays processing; no durable ref →
manual/webhook signal; 5xx/network → stays processing; succeeded → terminalizes).

**(b) Runtime activation** (`paymentSweepSchedule.ts`, wired in `app.ts`). Assembles the existing
sweeper + runner with BOTH durable safety controls:

- **Postgres kill switch** (`payment_sweep_control`) — fail closed: missing row / read error → OFF,
  checked FIRST on every pass before any selection.
- **Durable cross-instance lease** (`payment_sweep_lease`, fencing token) — two instances never sweep
  together.
- Conservative floors enforced at construction: **min age ≥ 10 min, batch ≤ 100**.

It is **double-gated off**: it only schedules when `PAYMENT_SWEEP_INTERVAL_MIN` is set (left UNSET in
committed/prod config), and even when scheduled it is inert until an operator arms the kill-switch row.
No new migration — it reuses the existing `payment_sweep_control` / `payment_sweep_lease` tables.

Tests: `paymentSweepSchedule.test.ts` (kill switch OFF → disabled, nothing selected/reconciled; ON →
one bounded pass; min-age/batch floors enforced).

## Manual steps still required before ANY real money (NONE done here)

1. **Provision & bind real keys** in staging secrets only: `STRIPE_TEST_SECRET_KEY` (sk_test_),
   `STRIPE_TEST_WEBHOOK_SECRET` (whsec_), `STRIPE_TEST_ACCOUNT_REFERENCE` (acct_), with
   `STRIPE_TEST_MODE_ENABLED=enabled`.
2. **CPA sign-off** recorded as `FINANCE_LIVE_CPA_SIGNOFF` (the config schema refuses
   `FINANCE_LIVE_ENABLED=enabled` without it).
3. **Enable the gate in STAGING first** (`FINANCE_LIVE_ENABLED=enabled` — the schema permits it only in
   staging/production with the sign-off present). Never flip it in prod before staging validation.
4. **Run a controlled TEST transaction** through the bound provider end-to-end, confirming webhook-first
   recovery resolves it and the sweep is only a backstop.
5. **Arm the sweep** (set `PAYMENT_SWEEP_INTERVAL_MIN` and the `payment_sweep_control` kill-switch row)
   only after 1–4, and observe its safe aggregate metrics (`payment.sweep.pass`).
6. Owner + CPA explicit go, per the standing rule, before production.

All of the above are deliberate, human-gated actions. This change only encodes the mechanism.

## Open question for the owner — short-shift billing

For a shift shorter than the 6-hour minimum, the worker is currently **paid 6h AND the employer is
billed 6h** — both `payableMinutes` and `billableMinutes` are set to the floored minutes
(`Math.max(rawElapsedMinutes, MINIMUM_STAFFING_SHIFT_MINUTES=360)`) in `packages/auth/src/index.ts`
(~line 9916/9925-9926). The owner may instead want **worker = actual hours, employer = 6h** (the
platform keeps the difference). That would require setting `payableMinutes` from `rawElapsedMinutes`
while `billableMinutes` stays floored. This is **surfaced, not changed** — it needs an owner ruling.
