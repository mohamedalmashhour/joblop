# HR-6.1 — Final Acceptance Matrix

Advisory AI payroll review, built on the frozen HR-5.1 engine (`c525028`). All four HR-6.1 chunks
are read-only / advisory: no live external AI, no persistence, no payroll mutation, no money
movement, no schema/migration change. Synthetic offline provider is the default; external egress is
capability-gated and disabled by default.

Baseline chain: HR-6 `794f2c2` → HR-6.1 `9fbbae3`/`6dcb74a` (C1) → `35c083e` (C2) → `43920b6` (C3)
→ **Chunk 4 (this commit)**.

Every PG proof runs behind the governed disposable-Postgres harness (`RWOS_TEST_DATABASE_URL`,
registered in `scripts/run-postgres-required-tests.ts`); all seven HR-6/6.1 PG suites pass together
(**41/41**).

## Chunk 1 — period-level / calc-time deterministic flags

| Claim | Source/static | Unit | PG/API | Status |
|---|---|---|---|---|
| Missing authoritative input (no worked time / no rate) | `payrollPeriodReview.ts` | ✓ | `postgres-payroll-period-review-paths` → `MISSING_AUTHORITATIVE_INPUT` ↔ `missing_rate` | PASS |
| Ambiguous jurisdiction | ✓ | ✓ | `AMBIGUOUS_JURISDICTION` ↔ `ambiguous_multi_jurisdiction` | PASS |
| Unsupported jurisdiction | ✓ | ✓ | `postgres-payroll-period-review` period-level flag | PASS |
| Unsupported provider | ✓ | ✓ | period-level `UNSUPPORTED_PROVIDER` | PASS |
| Intra-shift rate boundary | ✓ | ✓ | `INTRA_SHIFT_RATE_BOUNDARY` ↔ `rate_boundary_inside_approved_shift` | PASS |
| Parity with HR-5.1 authority (valid → 201) | — | — | valid worker `calculate()` → 201 | PASS |
| Zero write | source zero-write proof | — | rows/counts unchanged | PASS |

Unit: 14 · PG: 4 + 5.

## Chunk 2 — provenance / explainability (descriptive)

| Claim | Source/static | Unit | PG/API | Status |
|---|---|---|---|---|
| Historical contract/rate provenance | `payrollProvenance.ts` | ✓ | `postgres-payroll-provenance` v1(3000)/v2(3500) | PASS |
| Exact revision | — | ✓ | rev1 vs rev2 distinct fingerprint | PASS |
| Correction lineage | — | ✓ | governed correction → revisions [1,2] | PASS |
| Evidence binding | — | ✓ | every item `evidenceRef` resolves | PASS |
| No recomputation | ✓ | ✓ | descriptive only | PASS |
| No raw user text | — | ✓ | correctionReason never surfaced | PASS |
| Privacy (opaque refs, no PII) | ✓ | ✓ | sensitive-field guard | PASS |
| Zero write | source zero-write proof | — | immutable rows before/after | PASS |

Unit: 12 · Source: 3 · PG: 5.

## Chunk 3 — egress safety (future external AI)

| Claim | Source/static | Unit | PG/API | Status |
|---|---|---|---|---|
| Explicit allowlist envelope | `payrollReviewEgress.ts` | ✓ | recording provider sees only allowlist | PASS |
| Byte-level validation | — | ✓ (email/phone/SIN/tax/card/bank/token/secret) | — | PASS |
| Payload bounds | — | ✓ (16 KB, counts) | — | PASS |
| PII rejection | — | ✓ | adversarial PII never egresses | PASS |
| Token/secret rejection | — | ✓ | — | PASS |
| Injection containment | — | ✓ | stored injection text never egresses | PASS |
| Capability gate | source-level proof | ✓ | external only when flag+provider | PASS |
| Synthetic default | source-level proof | ✓ | default app never calls external | PASS |
| No accidental external egress | source-level proof | ✓ | — | PASS |

Unit: 20 · Source: 4 · PG: 6.

## Chunk 4 — content-free observability

| Claim | Source/static | Unit | PG/API | Status |
|---|---|---|---|---|
| Allowlisted telemetry only | `payrollTelemetrySafety` source proof | ✓ | recording sink → only allowlist keys | PASS |
| No payroll content / narrative / bodies | source proof (emit sites) | ✓ | — | PASS |
| No financial values | ✓ | ✓ | gross/net/ded/emp/rate absent from telemetry | PASS |
| No PII / adversarial text | — | ✓ | injection text + PII absent from telemetry | PASS |
| No persistence | source proof (no writes in module) | — | rows/counts unchanged after repeated calls | PASS |
| Telemetry failure isolation | — | ✓ | throwing sink → response still 200 | PASS |

Unit: 23 · Source: 5 · PG: 8.

## Aggregate

- Unit: C1 14 + C2 12 + C3 20 + C4 23 = **69** advisory-domain unit tests (plus the broader auth suite).
- Source-level proofs: C2 3 + C3 4 + C4 5 = **12**.
- Live PG suites (7): review-context 7, ai-review 6, period-review 4, period-review-paths 5,
  provenance 5, ai-egress 6, telemetry 8 = **41**.

## Standing invariants (all four chunks)

Live external AI called: **NO** · External provider configured: **NO** · Synthetic default: **YES**
· Payroll mutation: **NO** · Money execution: **NO** · New persistence: **NO** · Schema/migration:
**NO** · Admin UI expansion in HR-6.1: **NO** · PII/financial egress or telemetry: **NO** ·
HR-5.1 semantics: **unchanged**.

**HR-6.1 complete, pending acceptance.**
