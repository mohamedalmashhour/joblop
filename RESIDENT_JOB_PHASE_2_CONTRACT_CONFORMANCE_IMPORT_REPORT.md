# Resident Job Phase 2 Contract Conformance Import Report

Status: READY FOR OWNER REVIEW

This report covers Phase 2 item 1 only: contract-conformance import.

No Money Engine, money authority, money schema, money migration, payroll, finance, invoice, payment, escrow, provider integration, `money.ts` change, push, merge, deploy, or commit is authorized or performed by this report.

Current HEAD: `f503c10`

## 1. Imported Contract Harness

The HR workspace imports the portable kit directly from:

```text
contracts/conformance/suite.mjs
```

HR fixture:

```text
tests/contracts/fixtures/hr-money.fixture.mjs
```

Harness runners:

```text
tests/contracts/hr-money-conformance.test.mjs
tests/contracts/hr-contract-import.test.mjs
```

## 2. Kit Suite Run

Command:

```text
pnpm exec vitest run tests/contracts/hr-money-conformance.test.mjs tests/contracts/hr-contract-import.test.mjs --reporter=verbose
```

Expected Phase 2 item 1 behavior:

- the kit suite loads from `contracts/conformance/suite.mjs`
- the HR Phase 1 fixture is visible
- all executable money invariants remain skipped because no money layer exists
- no invariant is falsely reported green

Result:

```text
PASS
Test Files  3 passed | 1 skipped (4)
Tests       36 passed | 9 skipped (45)
```

## 3. Red Probe Evidence

### 3.1 Allocation Imbalance

Probe:

```text
tests/contracts/hr-contract-import.test.mjs
```

The probe feeds intentionally bad C4 evidence:

```text
commissionAtLowTax != commissionAtHighTax
```

Expected result:

```text
The kit C4 invariant rejects the fixture.
```

Status: PASS

### 3.2 Disabled Production Settlement Guard

Probe:

```text
tests/contracts/hr-contract-import.test.mjs
```

The probe feeds intentionally bad C5b evidence:

```text
sandboxRejectedInProd: false
```

Expected result:

```text
The kit C5b invariant rejects the fixture.
```

Status: PASS

### 3.3 Currency Mismatch

Owner-required C3:

```text
one money model — integer amountMinor + currency, convert-then-sum, no mixed-currency
```

Finding:

```text
The v1 contract kit has no executable C3 runner in contracts/conformance/suite.mjs.
```

Phase 2 item 1 action:

- C3 remains bound in the HR fixture metadata.
- The import test asserts the suite has no executable C3 case, so HR cannot falsely report currency-mismatch protection green.
- A test-only HR C3 import sentinel feeds intentionally bad mixed-currency evidence and asserts it fails. This is a red probe only, not a Money Engine implementation.
- The actual red-to-green C3 currency-mismatch proof is blocked until either the contract kit adds an executable C3 invariant or the owner approves a Money Engine phase C3 runner.

Status: BOUND, TEST-ONLY RED PROBE PASS, NOT EXECUTABLE IN KIT V1

## 4. S3 Correction

The Phase 0/1 report has been corrected:

```text
S3 is interim test-green, production-hardening required.
```

The current in-memory auth limiter proves local HTTP 429 behavior, but it is not production-grade because it can be bypassed across multiple instances or serverless cold starts and resets on process restart.

Hard pre-production task:

```text
Replace the current in-memory auth limiter with a distributed/shared-store limiter such as Upstash/Redis or approved edge rate limiting before HR receives production authentication traffic.
```

This does not block Phase 2 contract-conformance import.

## 5. Boundaries Preserved

Confirmed:

- no `money.ts` change
- no Money Engine implementation
- no money types introduced
- no money state authority introduced
- no invoice, payroll, payment, escrow, employer-payment, or worker-payable implementation
- no schema change
- no migration
- no provider integration

## 6. Validation Results

Validation run:

| Command | Result |
| --- | --- |
| `pnpm exec vitest run tests/contracts/hr-money-conformance.test.mjs tests/contracts/hr-contract-import.test.mjs tests/contracts/hr-security.test.mjs apps/api/src/app.test.ts --reporter=verbose` | PASS — `3 passed \| 1 skipped` files, `36 passed \| 9 skipped` tests |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — `61 passed \| 1 skipped` files, `365 passed \| 9 skipped` tests |
| `pnpm build` | PASS |
| `pnpm validate:env` | PASS |
| `pnpm validate:boundaries` | PASS |
| `pnpm scan:secrets` | PASS |
| `git diff --check` | PASS |

## Final Status

PHASE 2 CONTRACT CONFORMANCE IMPORT READY FOR OWNER REVIEW
