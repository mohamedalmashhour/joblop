# Resident Job Phase 4 Money Adapter Item 1 Report

Status: READY FOR OWNER REVIEW

This report covers Phase 4 item 1 only: map locked Timesheet handoff evidence plus worker/employer terms, jurisdiction, and policy versions into a contract input candidate.

No schema, migration, database, API, payroll, finance, invoice, payment, escrow, provider integration, push, merge, deploy, or commit is authorized or performed by this report.

Current HEAD: `8e902ab`

## 1. Kit Path Decision

Checked:

```text
contracts/VERSION
contracts/conformance/suite.mjs
```

Result:

```text
Platform Contract Kit — v1
```

No executable C3 runner is present in `contracts/`.

Decision:

```text
Proceed with Phase 4 while C3 remains bound, runner pending.
```

## 2. Red-First Evidence

New test:

```text
packages/shared/src/domain/hrMoneyAdapter.test.ts
```

Failing-first command:

```text
pnpm exec vitest run packages/shared/src/domain/hrMoneyAdapter.test.ts --reporter=verbose
```

Initial red result:

```text
3 failed
createHrMoneyContractInput is not a function
```

Interpretation:

The adapter test was written before the adapter existed and failed for the expected missing function.

## 3. Implementation

Added:

```text
packages/shared/src/domain/hrMoneyAdapter.ts
```

Updated:

```text
packages/shared/src/domain/index.ts
```

The adapter maps:

- locked Timesheet source reference
- Timesheet source version
- Assignment and Attendance references
- worker identity and organization scope
- residence, department, work group, and role references
- scheduled and actual time evidence
- payable and billable minutes
- worker terms version and classification
- employer terms version
- worker hourly rate and employer bill rate as `ContractMoney`
- country/province/country-pack jurisdiction
- counsel approval state
- adapter, labour, and classification policy versions

Output authority:

```text
contract_input_candidate_only
```

## 4. Fail-Closed Boundaries

The adapter rejects:

- non-locked Timesheets
- Timesheets without payroll and finance handoff-ready boundaries
- non-time-only Timesheet calculation boundaries
- missing or non-approved jurisdiction/counsel state
- missing policy versions
- missing worker or employer terms versions
- mismatched worker/employer terms currencies

## 5. Explicit Non-Ownership

The adapter does not:

- create Payroll
- create Finance records
- create Invoices
- create Payments
- create WorkerPayables
- create EmployerPayments
- execute provider actions
- alter Timesheets
- alter source records
- calculate statutory deductions
- determine legal classification
- perform AI decisions

## 6. C3 Status

C3 remains:

```text
bound, runner pending
```

The Money Engine local tests continue to cover integer minor units, explicit currency, mixed-currency rejection, and balanced allocation. HR will not claim shared-contract C3 green until kit v1.1 or an approved executable C3 runner is present and passes.

## 7. Validation

| Command | Result |
| --- | --- |
| `pnpm exec vitest run packages/shared/src/domain/hrMoneyAdapter.test.ts --reporter=verbose` before implementation | FAIL as expected — `createHrMoneyContractInput is not a function` |
| `pnpm exec vitest run packages/shared/src/domain/hrMoneyAdapter.test.ts packages/shared/src/domain/money-engine.test.ts tests/contracts/hr-contract-import.test.mjs --reporter=verbose` | PASS — `3 passed` files, `10 passed` tests |
| `pnpm --filter @rwos/shared typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — `63 passed`, `1 skipped` files; `372 passed`, `9 skipped` tests |
| `pnpm build` | PASS |
| `pnpm validate:env` | PASS — `ENV_VALIDATION_PASS` |
| `pnpm validate:boundaries` | PASS — `WORKSPACE_BOUNDARY_VALIDATION_PASS` |
| `pnpm scan:secrets` | PASS — `SECRET_SCAN_PASS` |
| `git diff --check` | PASS |

Skipped contract tests:

```text
tests/contracts/hr-money-conformance.test.mjs
9 skipped
```

Interpretation:

The contract money conformance fixture remains intentionally gated because the current `contracts/` kit is v1 and does not include the executable C3 runner.

## Final Status

PHASE 4 MONEY ADAPTER ITEM 1 READY FOR OWNER REVIEW
