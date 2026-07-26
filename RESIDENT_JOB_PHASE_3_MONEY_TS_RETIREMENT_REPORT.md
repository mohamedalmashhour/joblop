# Resident Job Phase 3 Money.ts Retirement Report

Status: READY FOR OWNER REVIEW

This report covers Phase 3 item 2 only: retire and migrate the legacy CAD-only `money.ts` helper per ADR-0002 Decision 1.

No schema, migration, database, API, payroll, finance, invoice, payment, escrow, provider integration, push, merge, deploy, or commit is authorized or performed by this report.

Current HEAD: `95aca20`

## 1. Consumer Inventory

Legacy `money.ts` consumers found before migration:

```text
packages/shared/src/domain/index.ts
packages/shared/src/domain/shift.ts
packages/shared/src/domain/money-boundary.test.ts
packages/validation/src/domain/shift.ts
packages/validation/src/domain/application.ts
apps/mobile/src/features/shifts/formatters.ts
```

Interpretation:

- `shift.ts` imported legacy `Currency` and `MoneyAmount` directly.
- validation schemas consumed `currencies` through `@rwos/shared`.
- mobile formatters consumed `MoneyAmount` through `@rwos/shared`.
- the old boundary test imported and pinned the CAD helper.

## 2. Red-First Evidence

New deletion guard:

```text
packages/shared/src/domain/money-retirement.test.ts
```

Failing-first command:

```text
pnpm exec vitest run packages/shared/src/domain/money-retirement.test.ts --reporter=verbose
```

Initial red result:

```text
2 failed
expected true to be false
packages/shared/src/domain/index.ts must not import legacy money.ts
```

Interpretation:

The deletion guard failed while `money.ts` still existed and was still exported.

## 3. Migration Performed

Changed:

```text
packages/shared/src/domain/moneyEngine.ts
packages/shared/src/domain/shift.ts
packages/shared/src/domain/index.ts
packages/shared/src/index.ts
packages/shared/src/domain/money-engine.test.ts
packages/shared/src/domain/money-retirement.test.ts
```

Deleted:

```text
packages/shared/src/domain/money.ts
packages/shared/src/domain/money-boundary.test.ts
```

Behavior:

- `Currency` now aliases `MoneyEngineCurrency`.
- `MoneyAmount` now aliases `ContractMoney`.
- `currencies` now aliases `moneyEngineCurrencies`.
- root `Money` now aliases `ContractMoney`.
- `shift.ts` imports money types from `moneyEngine`.
- `domain/index.ts` no longer exports `./money`.
- the deletion guard proves the legacy helper file no longer exists.
- the import guard proves scanned source files no longer import `./money`.
- the CAD equivalence guard proves legacy CAD amount behavior is preserved: `{ amountMinor: 5000, currency: "CAD" }` remains valid and negative/fractional CAD minor units remain rejected.

## 4. C3 Status

C3 remains:

```text
bound, runner pending
```

The engine's own tests cover C3-style behavior:

- integer minor units
- explicit currency
- mixed-currency rejection
- balanced integer allocation

However, HR does not claim shared-contract C3 green until the upstream kit provides an executable C3 runner or the owner approves an equivalent conformance runner.

## 5. Validation

| Command | Result |
| --- | --- |
| `pnpm exec vitest run packages/shared/src/domain/money-retirement.test.ts --reporter=verbose` before migration | FAIL as expected — legacy file existed and export remained |
| `rg "from ['\"]\\./money['\"]|from ['\"]@rwos/shared/domain/money['\"]|createMoneyAmount" -n packages apps tests --glob '!**/node_modules/**'` | PASS — no matches |
| `pnpm exec vitest run packages/shared/src/domain/money-retirement.test.ts packages/shared/src/domain/money-engine.test.ts packages/validation/src/domain/domain.test.ts packages/validation/src/domain/application.test.ts tests/contracts/hr-contract-import.test.mjs --reporter=verbose` | PASS — `5 passed` files, `20 passed` tests |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — `62 passed \| 1 skipped` files, `368 passed \| 9 skipped` tests |
| `pnpm build` | PASS |
| `pnpm validate:env` | PASS |
| `pnpm validate:boundaries` | PASS |
| `pnpm scan:secrets` | PASS |

Disk note:

```text
Available space before final build: approximately 863 MiB after clearing generated caches.
Available space after final build: approximately 675 MiB.
```

No ENOSPC warning appeared in the final build.

## 6. Boundaries Preserved

Confirmed:

- no schema change
- no migration
- no API change
- no payroll implementation
- no finance implementation
- no invoice implementation
- no payment implementation
- no escrow implementation
- no provider integration
- no C3 shared-contract green claim

## Final Status

PHASE 3 MONEY.TS RETIREMENT READY FOR OWNER REVIEW
