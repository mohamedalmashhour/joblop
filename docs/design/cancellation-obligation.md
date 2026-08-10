# Design: Employer late-cancellation obligation (48-hour rule)

**Status: DESIGN ONLY — no financial execution.** This documents the model + tests to
build. Per owner instruction, present architecture/legal conflicts before implementing
any money movement. Nothing here charges a card, collects money, or marks anything paid.

## Product rule
- **Minimum shift:** 6 hours per worker (already enforced server-side — `MINIMUM_STAFFING_SHIFT_MINUTES`).
- **Cancel ≥ 48h before shift start:** no JobLop late-cancellation obligation.
- **Cancel < 48h before shift start:** for **each affected _confirmed_ worker**, an obligation of
  **6h × governed contracted hourly rate × affected confirmed workers**.
  - Example: 2 confirmed × 6h × $30/hr = **$360.00** (`amountMinor: 36000, currency: CAD`).
- **Authoritative calculation is server-side.** The browser never supplies the rate, hours, worker
  count, cutoff decision, or amount. The 48h cutoff is evaluated against the server clock.

## Cancellation causes (obligation only for employer-controlled cancellation)
Reuse/extend the existing assignment cancellation reason vocabulary
(`packages/auth/src/index.ts` — `employer_cancelled`, `platform_cancelled`, `cancellationReasonCategory`).
The obligation applies **only** when the cause is employer-initiated:

| Cause | Employer late-cancel obligation? |
|---|---|
| `EMPLOYER_CANCELLED` | **Yes**, if < 48h and confirmed workers exist |
| `WORKER_CANCELLED` / `WORKER_NO_SHOW` | No (not employer-caused) |
| `PLATFORM_UNABLE_TO_FILL` / `PLATFORM_CANCELLED` | No (JobLop-caused) |
| `MUTUALLY_CANCELLED` | No (default; may be configurable later) |

"Affected confirmed workers" = assignments in a **confirmed/accepted** state for the request at
cancel time. Draft/unfilled positions carry no obligation. **Accepted worker terms are never
silently changed** — a reduction/cancel that touches confirmed workers routes through the governed
cancel/redispatch flow and is surfaced for explicit confirmation.

## Where it persists (respecting the money-governance boundary)
**Conflict flagged:** the API money boundary (`apps/api/src/non-money-boundary.test.ts`) forbids these
route strings in `app.ts`: `/payroll /finance /invoices /payments /worker-payables /employer-payments
/escrow /held-funds /money-engine`. The obligation must therefore be modelled as an **auditable
financial-intent record**, not a payment/invoice route.

Proposed: a new `EmployerCancellationObligation` record (employer↔JobLop **commercial** obligation),
persisted under the assignment/request cancellation flow — e.g. `POST …/assignments/:id/cancel`
returns the computed obligation and writes the record. Fields:
`id, organizationId, jobRequestId/assignmentId, causeCategory, cutoffHours=48, shiftStartAt,
hoursPerWorker=6, governedRateMinor, currency, affectedConfirmedWorkers, amountMinor (=6×rate×workers),
contractId + contractVersion (rule/rate snapshot), computedByUserId, computedAt, status="obligation_recorded",
correlationId`. **Status is never "paid"** — actual settlement is a later Finance/Payroll concern behind
the governed finance boundary. Corrections use adjustment/reversal entries, never in-place edits
(financial immutability).

## Contract versioning (Section 13)
The 6h minimum and the 48h/6h cancellation terms become **governed contract terms** carried on
`EmployerContract` (add e.g. `minimumShiftHours`, `lateCancellationCutoffHours`,
`lateCancellationChargeHours`) with the existing contract `version`. Each staffing request/assignment
**snapshots the contract version + the rate** it was created under, so the obligation reproduces the
rule/rate that applied at the time — not today's. (Do not hard-code these terms only in React.)

## Québec / legal constraint (flagged, not resolved)
Keep this strictly an **employer ↔ JobLop commercial** obligation. Do **not** invent worker wage
deductions, worker penalties, or worker cancellation fees. JobLop may fall under Québec
personnel-placement (CNESST) rules depending on the final operating model — the obligation's legal
character needs **employment-law sign-off** before any settlement/execution is wired.

## Tests to write (design targets, before execution code)
Deterministic unit tests on the calculator + cause gating:
exactly-48h boundary (no charge); 47h59m (charge); >48h (no charge); multiple confirmed workers;
zero confirmed workers (no charge); partially filled (only confirmed count); `WORKER_CANCELLED` /
`WORKER_NO_SHOW` / `PLATFORM_UNABLE_TO_FILL` (no employer charge); rate/hours/workers taken from the
**snapshotted contract** not the request body (client-tamper rejected); idempotent/repeated cancel
(one obligation, not duplicated); reduce-workers that cancels confirmed workers computes consequences
before confirmation; concurrent cancellation (single obligation under a race).

## Blocked pending owner decision
1. Confirm `MUTUALLY_CANCELLED` carries no obligation (assumed).
2. Confirm the obligation is purely employer↔JobLop commercial (no worker-facing money) — legal.
3. Any settlement/collection is deferred to the Finance/Payroll department (separate gate).
