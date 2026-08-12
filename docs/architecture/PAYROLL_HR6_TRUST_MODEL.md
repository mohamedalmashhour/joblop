# HR-6 — AI Payroll Review Trust Model (Chunk 1)

Status: **Chunk 1 only** — trust model + sanitized read-only context + deterministic review
flags. No AI/LLM provider is integrated. No model is called. Nothing is persisted. The frozen
HR-5.1 payroll engine (baseline `c525028`) is unchanged.

## The one hard boundary

AI is **advisory only**. It may explain, summarize, surface anomalies, flag missing data, and
help a human prioritize review. It may **never** become a financial authority.

AI MUST NEVER (now or in any later chunk) modify or become authoritative for:
EmployerContract / ContractRoleRate, compensation or rates, approved worked time, timesheets,
jurisdiction, provider or rule selection, payroll formulas, earning/deduction/employer-cost
lines, gross/deductions/net, the calculation fingerprint, corrections, revisions, approval,
rejection, locking, post-lock adjustments, or any money movement. It must never invent a
financial value, guess a missing rate, estimate missing worked time, choose a jurisdiction,
recalculate independently, alter an `ApprovedPayrollCalculation`, or initiate
banking/EFT/ACH/remittance/tax-filing/statutory-compliance determinations.

## Direction of trust (one-way only)

```
AUTHORITATIVE STATE            deterministic, governed by HR-5.1
  EmployerContract / rates
  ApprovedWorkedTime
  PayrollCalculation (+ fingerprint, revisions, locks)
        │  read-only
        ▼
SANITIZED CONTEXT              assemblePayrollReviewContext() — pure, no Prisma, no writes
  opaque refs, minimized fields, bounded, truncation metadata
        │
        ▼
DETERMINISTIC FLAGS           computePayrollReviewFlags() — pure, explicit thresholds
  REPLAY_MISMATCH, POST_LOCK_ADJUSTMENT, MULTIPLE_RATE_SEGMENTS,
  LARGE_REVISION_DELTA, CORRECTION_REVISION, HIGH_HOURS_REVIEW
        │
        ▼
(FUTURE) ADVISORY AI FINDINGS  Chunk 2+ — bound to the evidence above, still advisory
        │
        ▼
HUMAN REVIEWER                 the only actor that can approve / lock / correct
```

There is **no reverse arrow**. Nothing downstream can write upstream.

## Data minimization

`PayrollReviewContext` is an allowlist projection. Worker identity is reduced to an opaque
`worker-<8 hex>` reference. **Excluded by construction:** SIN, bank/routing numbers, tax IDs,
home address, phone, personal email, DOB, identity documents, passwords, secrets, tokens, and
unrelated HR data. A regex guard (`contextHasNoSensitiveFields`) backstops the projection.

User-controlled free text (e.g. a correction reason) is carried **only** in the dedicated
`untrustedText` slot — never merged into flag `detail` strings or treated as an instruction.
This keeps instruction and data separable ahead of Chunk-2 provider work (prompt-injection
defense).

## Bounded context

Worked-time entries are capped (`PAYROLL_REVIEW_MAX_WORKED_TIME = 100`) and the family scan is
capped; truncation is reported in `bounds` so a reader knows the context is partial. Flags carry
an `evidenceRef` that must resolve to a key actually present in the supplied `evidence` map.

## Deterministic flags, not judgements

Flags are computed server-side from the artifact, with explicit thresholds
(`DEFAULT_PAYROLL_REVIEW_THRESHOLDS`). They describe **what to look at**, never fraud, crime, or
dishonesty. Calc-time failures (missing authoritative input, ambiguous/unsupported jurisdiction
or provider, intra-shift rate boundary) fail closed in HR-5.1 and never produce a stored
calculation, so they surface on the future/bulk path rather than as flags on an existing calc.

## Read-only endpoint

`GET /platform/payroll/calculations/:calculationId/review-context` (behind
`requirePayrollAuthority`) builds the context **after** authorization and an exact calculation
lookup, reads only within that calculation's own family/period, and returns **only** the
sanitized context. It performs no write and records no audit event (there is no AI call yet).
A source-level proof (`payrollReviewContextEndpoint.test.ts`) asserts the handler contains no
`create/update/upsert/delete/executeRaw/$transaction/recordAudit`.
