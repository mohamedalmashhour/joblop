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

### Two-timer hold (owner's model)

There are **two distinct timers**, anchored on two different events:

1. **48h dispute / confirmation window** — anchored on **job completion** (the latest shift end across
   the calculation's worked-time references; `WORKER_PAYOUT_DISPUTE_WINDOW_HOURS = 48`). During this
   window the money is **not yet the worker's to count on** — the client may still flag something wrong.
   A dispute raised in the window pauses the payout (`held`). After 48h with **no** dispute the amount
   becomes **confirmed / "registered in the worker's account"** (`registeredAt` is set) and the worker
   is notified then (`notifyWorkerPayoutRegistered`).
2. **14-day transfer hold** — anchored on the **pay-period end** (`WORKER_PAYOUT_HOLD_DAYS = 14`),
   unchanged. It gates the actual **release → (TEST) transfer** and now applies **only after** the
   payout is registered.

Lifecycle: finish → **48h dispute window** (`review_window`) → (no dispute) → **registered** + notify
→ **14-day hold** → `released` → `paid`. The worker's pay view shows exactly three stages —
"In 48-hour review window" → "Registered in your account — awaiting transfer" → "Paid (reference)" —
and never shows confirmed-earnings copy during the 48h window.

Pure helpers in `packages/shared/src/domain/workerPayout.ts`: `canRegisterWorkerPayout` (48h,
completion-anchored), `canReleaseWorkerPayout` / `nextWorkerPayoutStatus` (now require `isRegistered`),
`workerPayoutStage` (the worker-facing stage). `completion_at` / `registered_at` columns added
(migration `20261028020000_worker_payout_dispute_window`; both nullable, additive — legacy rows backfill
`completion_at` on read).

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
- **Registration** — `materializeAndListWorkerPayouts` sets `completion_at` (latest shift end) on create
  and, when the 48h window closes clean, sets `registered_at` and returns the payout in `newlyRegistered`;
  the `/worker/payouts` route then fires `notifyWorkerPayoutRegistered` once. Release now requires the
  payout to be registered first.
- **Notifications** — `notifyWorkerPayoutRegistered` (new, FR/EN) "registered in your account" when the
  48h window closes; `notifyWorkerPayoutPaid` (FR/EN) now carries the reference for the later "sent/paid".
- **Worker view** — `/worker/payouts` + `MyPay.tsx` surface the three stages via `stage`:
  "In 48-hour review window" → "Registered in your account — awaiting transfer" → "Paid (reference)";
  no confirmed-earnings copy during the review window. The SYNTHETIC/TEST chip stays.

## Flow

locked payroll calculation → `/worker/payouts` materialises a `pending` payout (stage `review_window`) →
**48h completion-anchored dispute window** elapses with no dispute → **registered** (`registered_at` set,
worker notified) → **14-day period-end transfer hold** elapses → **released** → admin
`POST …/execute-test-payout` (gated) → Stripe TEST transfer *or* synthetic reference → `paid`
(+ `payment_ref`, `paid_at`) → worker emailed + the pay view shows `paid` + reference. A dispute in the
window holds the payout and blocks registration; a dispute later holds it and blocks execution.

## Verification

- `tsc` (api, config, worker, `pnpm typecheck`) ✅ · eslint ✅ · `pnpm validate:migrations` ✅
- shared vitest **265 passed** ✅ (domain two-timer lifecycle) · api vitest **420 passed / 6 skipped** ✅ ·
  config vitest **43 passed** ✅
- **Real reproduction** — `tests/integration/postgres-worker-payout-test-execution-e2e.test.ts` run
  against a **real Postgres** (full migration history deployed): a locked calculation materialises,
  registers (48h) then auto-releases (14d); the gated endpoint flips it to `paid` with a synthetic
  reference; the worker read surfaces it; a second call is idempotent; the gate off → 423 with nothing
  moved; a payout within its 48h window stays `review_window` (unregistered, unreleased even though the
  14-day hold elapsed), registers exactly once, then releases; and a dispute in the window blocks
  registration (`held`). DB inspection confirmed `completion_at`/`registered_at`/`payment_ref` states.

## Real-Stripe-payout follow-up (out of scope)

A production payout would use Stripe Connect transfers/payouts to a **verified, onboarded** connected
account, reconciled by `transfer.*` / `payout.*` webhooks, behind the money licence + KYC/AML + CPA
sign-off. This module keeps that shape (destination connected account + metadata + idempotency key) so
the real path can be wired without re-architecting, but it is deliberately **not** enabled.
