# HR-5.1 — Payroll Calculation Hardening (TEST / SYNTHETIC)

**Terminal state: `ApprovedPayrollCalculation` (and its locked/corrected history).** No money
execution, no `paid` state, no banking/remittance/direct-deposit, no statutory-compliance claim.
The rule provider is a synthetic fixture.

## Authoritative inputs
- **Compensation:** the governed `EmployerContract` → `ContractRoleRate.hourlyRateMinor` (per-role,
  platform-authored, versioned via contract lifecycle + `effectiveFrom`). Resolved through each
  worker's assignment role scope `(organizationId, workGroupId, roleDefinitionId)`. Payroll invents
  no rate; there is no per-worker rate model.
- **Worked time:** approved/locked `Timesheet` rows only (never raw attendance), carrying the shift
  window + role/worksite scope.
- **Jurisdiction:** derived from `Timesheet.residenceId → Residence.province` (+ `country`, default
  `CA` where null). Never trusted from the caller; the period jurisdiction must match the worksite.

## Historical effective-rate resolution
`findContractEffectiveAt(org, instant)` selects the committed contract in force at a shift's start
instant (active **or** superseded), ordered by `effectiveFrom desc, activatedAt desc` (deterministic
tie-break). Historical work always reads the rate that governed then — never the current rate.

## Snapshots, segmentation, intra-shift fail-safe
Each timesheet is snapshotted immutably (`payroll_worked_time_references`) with its shift window,
role scope, and the applied contract id/version/effectiveFrom/rate. Earnings are **segmented by
contract version** (one regular line per rate, with provenance). A rate boundary **strictly inside**
an approved shift is detected and the worker's calculation **fails** with
`rate_boundary_inside_approved_shift` (aggregate minutes cannot be split — no guessing).

## Provider/version governance, replay, fingerprint
Every calculation pins `providerKey@providerVersion` + `calculationPolicyVersion`. `verifyCalculation`
recomputes from the stored snapshot using the **exact historical provider version** (never "latest";
missing version fails closed) and compares integer-exact totals + a deterministic SHA-256 fingerprint.
The fingerprint is stable across replays and changes only when an authoritative input changes.

## Revisions, corrections, adjustments
A `(period, worker)` line is a **family** with immutable revisions (`previous_calculation_id` +
`previous_fingerprint`). A pre-lock correction creates a new `pre_lock_revision` superseding the
prior; a post-lock correction creates a linked `post_lock_adjustment` with a **signed delta**
(direction `credit|debit` + non-negative absolute Money — never negative Money) and leaves the locked
original immutable (DB trigger enforced). Corrections recompute from authoritative inputs and never
accept amounts.

## Idempotency & concurrency
Identical inputs → no new revision (fingerprint match); a `correlation_key` is unique per family
(duplicate submission → existing result). Version-guarded optimistic updates + partial-unique
invariants (`one-current-per-family`) + locked-immutability triggers keep every race deterministic
(correction-vs-lock, approve-vs-correct, correction-vs-correction, lock retries, bulk-vs-single) —
losers get a governed `409`, never a duplicate revision or a `500`.

## Bulk calculation (bounded)
`POST /platform/payroll/periods/:id/bulk-calculate` — calculation-only (never approves/locks/pays).
Keyset-bounded worker pages; the **same single-worker engine** per worker; bounded concurrency
(pool 4) with backoff retry for transient serialization conflicts and **per-worker failure
isolation** (one bad worker never corrupts the period); a bounded per-worker summary
(calculated/no_change/failed/conflict) + a next cursor. Idempotent on re-run.

## Scale evidence (synthetic, local test host)
10,000 synthetic workers, one period: bulk calculated in 40 bounded pages, **~252 calc/s**, RSS
growth **~134 MB** (bounded — not linear in the population). `EXPLAIN ANALYZE` at 10k: the selective
lookups on the high-cardinality tables are **Index Scans** — `payroll_calculations` by
`(worker_identity_id, payroll_period_id)` (~0.01 ms) and `timesheets` by
`(worker_identity_id, status, scheduled_start_at)` (~0.01 ms). `employer_contracts` legitimately Seq
Scans (one or two contracts per org — a tiny table; forcing an index would be wrong). These are
local test-host numbers, **not** production capacity claims.

## Boundaries (reaffirmed)
No payroll write endpoint initiates payment / bank transfer / mark-paid / remittance / employer-debit
/ worker-credit. No database state means "money moved". The admin console and worker My Pay have no
money-execution control. The provider is synthetic; no statutory/tax-compliance is claimed.

## Known limitations
Per-role (not per-worker) rate authority; synthetic provider only; intra-shift rate-boundary shifts
fail-closed (upstream attendance does not model sub-shift minutes); payroll authority is platform-
level (not per-tenant payroll admins); contract effective dating is activation-based (no arbitrary
future/back-dating). Real jurisdiction packs, real rate/classification sources, and money execution
are out of scope for HR-5.1.
