# Worker payout — Stripe TEST execution (Money-flow Phase 2)

Phase 2 of the four-phase JobLop money/transaction program. It adds the **worker payout** side on top of
Phase 1 (employer invoice → Stripe TEST collection): a gated, idempotent, **test-only** execution that
marks an already-**released** worker payout `paid` and records a TEST payment reference.

> **Hard rule — TEST / SYNTHETIC ONLY.**
> - `FINANCE_LIVE_ENABLED` is **untouched and stays off**. This path never reads it.
> - `createStripeTestClient` still refuses any non-`sk_test_` secret — no live key, no real money.
> - No real funds reach a worker. A real payout needs a money-transmitter / payout licence + KYC/AML +
>   CPA sign-off and is **out of scope** (see *Real-Stripe-payout follow-up* below).

## What already existed (unchanged)

The payout **ledger** and its release lifecycle were built earlier and are not re-implemented here:

- `worker_payouts` table (`WorkerPayout`): one row per locked payroll calculation —
  `amountMinor` (= net pay), `currency`, `status` (`pending`→`released`→`paid`, plus `held`/`cancelled`),
  `holdUntil`, `releasedAt`, `paidAt`, `heldReason`. Idempotent (unique on `payroll_calculation_id`).
- The hold + auto-release + dispute-pause logic (`packages/shared/src/domain/workerPayout.ts`,
  `apps/api/src/workerPayoutRepository.ts`): a payout materialises `pending` for each **locked** payroll
  calculation, **auto-releases** once the hold has elapsed with no open dispute, and moves to `held`
  while a dispute is open.
- `/worker/payouts` (worker read) and the worker pay view (`apps/worker/app/pay/MyPay.tsx`).
- `/platform/worker-payouts/:payoutId/mark-paid` — a **hard finance-gated** (423 unless
  `FINANCE_LIVE_ENABLED`) released→paid transition + notification. Left as-is; it is the live-finance seam.

### Hold period — note for review

The existing ledger uses a **14-day** hold anchored to the pay-period end
(`WORKER_PAYOUT_HOLD_DAYS = 14`), the practical stand-in for "two weeks after the work". The Phase 2
brief asked for a **48h** dispute hold. 14 days is **strictly stronger** than 48h for the "a payout
cannot be paid before it is releasable" guarantee, so this change **kept 14 days** rather than regress a
money-protection window. If the owner wants the shorter 48h window, change `WORKER_PAYOUT_HOLD_DAYS`
(one constant) — flagged here for an explicit ruling.

## What Phase 2 adds (test execution)

- **Gate** — new independent `PAYOUT_TEST_MODE_ENABLED` flag (`packages/config`): off by default,
  refused in production, requires `STRIPE_TEST_MODE_ENABLED`, and refused together with live finance.
  Independent of `FINANCE_LIVE_ENABLED`. Optional `STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT` (must be
  `acct_…`) names the TEST connected account a transfer targets.
- **Ledger column** — `worker_payouts.payment_ref` (+ migration
  `20261028010000_worker_payout_payment_ref`): the TEST reference recorded on `paid`. Null until paid.
- **Transfer module** (`apps/api/src/workerPayoutStripeTransfer.ts`) — when a TEST connected account is
  configured, a Stripe **TEST** transfer (`tr_…`) to it; otherwise a recorded **synthetic** reference
  (`payout-test-synthetic-<payoutId>`). The shared test client refuses any non-`sk_test_` secret.
- **Execution** (`apps/api/src/workerPayoutExecution.ts`) — `executeTestWorkerPayout`: gate + Stripe-
  configured checks, loads the payout, requires status `released`, performs the transfer, and flips the
  row to `paid` with `payment_ref` + `paid_at` via a **status-guarded** `updateMany` (no double-pay).
  **Idempotent**: an already-`paid` payout returns success unchanged, and a lost guard race re-reads and
  treats a concurrently-paid row as success.
- **Route** — `POST /platform/worker-payouts/:payoutId/execute-test-payout` (admin-gated). Gated on
  `runtimeConfig.payoutTestModeEnabled` (production-safe) **and** the process-env flag; **independent of
  `financeLive`**. Fires the "money received" notice with the reference. Never reads `FINANCE_LIVE_ENABLED`.
- **Notification** — `notifyWorkerPayoutPaid` now carries the optional reference into the bilingual
  (FR/EN) "your payment has been sent" email.
- **Worker view** — `/worker/payouts` and `MyPay.tsx` surface the `paid` state with its reference; the
  SYNTHETIC/TEST chip stays.

## Flow

locked payroll calculation → `/worker/payouts` materialises a `pending` payout → hold elapses, no open
dispute → **auto-released** → admin `POST …/execute-test-payout` (gated) → Stripe TEST transfer *or*
synthetic reference → payout → `paid` (+ `payment_ref`, `paid_at`) → worker emailed + the pay view shows
`paid` + reference. A dispute at any point holds the payout and blocks execution (status ≠ `released`).

## Verification

- `pnpm --filter @rwos/config exec tsc --noEmit` ✅ · config vitest **43 passed** ✅
- `pnpm --filter @rwos/api exec tsc --noEmit` ✅ · eslint ✅ · api vitest **418 passed / 6 skipped** ✅
- `pnpm typecheck` ✅ · worker `tsc --noEmit` ✅ · `pnpm validate:migrations` ✅
- **Real reproduction** — `tests/integration/postgres-worker-payout-test-execution-e2e.test.ts` run
  against a **real Postgres** (full migration history deployed): a locked calculation materialises and
  auto-releases a payout; the gated endpoint flips it to `paid` with a synthetic reference; the worker
  read surfaces it; a second call is idempotent; and with the gate off the endpoint refuses (423) with
  nothing moved. DB inspection confirmed the paid row carries `payment_ref` + `paid_at` and the gated-off
  rows stayed `released` with no reference.

## Real-Stripe-payout follow-up (out of scope)

A production payout would use Stripe Connect transfers/payouts to a **verified, onboarded** connected
account, reconciled by `transfer.*` / `payout.*` webhooks, behind the money licence + KYC/AML + CPA
sign-off. This module keeps that shape (destination connected account + metadata + idempotency key) so
the real path can be wired without re-architecting, but it is deliberately **not** enabled.
