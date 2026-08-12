# HR-5.1 Chunk 3 — Payroll Corrections, Revisions & Adjustments (TEST / SYNTHETIC)

**No money execution.** Terminal state remains `ApprovedPayrollCalculation` (or its governed
locked/corrected history). No `paid` state, no banking, no remittance, no statutory-compliance claim.

## Revision model
Every `(payroll_period, worker)` line is a **family** (`family_root_id`). Each recompute is a new
immutable `payroll_calculation` row with a `revision` number, `previous_calculation_id`, and
`previous_fingerprint`. Historical revisions are never mutated. At most **one** live approvable
revision exists per family (partial unique index on `family_root_id WHERE status IN
('calculated','in_review','approved')`).

## Pre-lock correction
`requestCorrection` on a non-locked revision recomputes from the **current authoritative inputs**
(approved worked time + committed contract rate + worksite jurisdiction) and creates a new
`pre_lock_revision` that version-guard supersedes the prior. The prior row is untouched. Correction
callers never supply financial amounts.

## Post-lock adjustment
`LOCKED` is terminal immutable history (enforced by a DB trigger that rejects any UPDATE of a locked
row). A correction after lock creates an explicit `post_lock_adjustment` calculation linked to the
locked original (`adjusts_calculation_id`). The adjustment carries a **signed delta by direction**:
`{net,gross,deductions,employer_cost}` each as `direction ∈ {credit,debit}` + a **non-negative
absolute** minor-unit amount (CHECK-constrained ≥ 0). Money is never negative; `applyPayrollDelta`
proves `original + governed(direction, delta) = corrected`.

## Authoritative inputs only
Corrections originate from governed upstream changes (a new `EmployerContract`/`ContractRoleRate`
version, corrected approved worked time, jurisdiction/worksite correction). There is no
"type the correct amount" path.

## Idempotency
- **No-change:** identical authoritative inputs (same fingerprint) return the existing calculation —
  no new revision.
- **Duplicate submission:** a `correlation_key` is unique per family (partial unique index); a retry
  returns the existing result (`outcome: "duplicate"`).

## Concurrency
Version-guarded optimistic updates + partial-unique invariants + the locked-immutability trigger.
Proven with real PostgreSQL races: correction-vs-lock, approve-vs-correct, correction-vs-correction,
lock retries — all deterministic, losers get a governed `409`, never a duplicate revision, lost
correction, mutated locked history, or `500`.

## Fingerprint chain & replay
`previous_fingerprint → calculation_fingerprint` is stored per revision. Replay/verify recomputes a
historical revision from its **own stored snapshot** + the **exact stored provider version** (never
"latest"; missing version fails closed) and compares integer-exact — still verifies after later
corrections.

## DB invariants (forward-only migration `20260811150000_payroll_corrections`)
- CHECK: `correction_type ∈ {pre_lock_revision, post_lock_adjustment}`; directions ∈ {credit,debit};
  absolute deltas ≥ 0; post-lock adjustment requires target + reason + net direction/delta; pre-lock
  revision requires reason + previous linkage.
- Partial unique: idempotency `(family_root_id, correlation_key)`; one-current
  `family_root_id WHERE status IN ('calculated','in_review','approved')`.
- Triggers: locked calculation immutable; approved/locked financial lines + worked-time snapshots
  immutable to direct UPDATE/DELETE.
