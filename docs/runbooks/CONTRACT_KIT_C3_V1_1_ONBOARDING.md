# Contract Kit C3 v1.1 Onboarding

Status: **PENDING CONTRACT-OWNER ARTIFACT AND APPROVAL**

## Required artifact

The contract owner must provide an immutable Platform Contract Kit v1.1 export containing:

- a version manifest identifying `v1.1` and its source commit;
- unchanged authoritative contract definitions and conformance runner;
- an executable C3 “one money model” case covering explicit currency, integer minor units,
  unsupported precision, mixed-currency rejection, and normalized safe errors;
- producer/consumer fixtures, required and forbidden fields, authorization expectations, privacy
  boundaries, and any declared v1 compatibility rules;
- artifact checksums and the named contract owner.

The repository currently contains `contracts/VERSION` at v1. It must not be relabelled or locally
extended as v1.1.

## Intake location

Place the owner-supplied export in a temporary quarantine directory outside application import
paths. After checksum and provenance review, replace the `contracts/` directory only through a
dedicated reviewed change. Do not merge generated fixtures, secrets, production records, or
product-specific economics.

Resident Workforce OS consumers are:

- `tests/contracts/hr-contract-import.test.mjs`;
- `tests/contracts/hr-money-conformance.test.mjs`;
- `tests/contracts/fixtures/hr-money.fixture.mjs`;
- `packages/shared/src/domain/moneyEngine.ts`;
- `packages/shared/src/domain/hrMoneyAdapter.ts`.

The current suite has nine skipped v1 cases: C1 economics leak, C2 sensitive-route authorization,
C4 commission/base behavior, C5 settlement reference, C5b sandbox-reference production rejection,
C6 fail-closed jurisdiction, C7 frozen terms, C8 no double-book, and C9 append-only audit. Their
fixture reasons are phase/scope-specific and must be reviewed independently; they are not C3 tests.
C3 is absent from the v1 runner entirely. v1.1 intake must add its authoritative C3 case without
silently converting unrelated skipped behavior to green.

## Validation

After approved installation:

```sh
pnpm exec vitest run tests/contracts
pnpm typecheck
pnpm lint
pnpm test
pnpm validate:boundaries
pnpm scan:secrets
```

Acceptance requires an executed passing C3 case (not merely zero skips), unchanged red probes
rejecting mixed currencies and invalid precision, explicit review of every other skip,
producer/consumer compatibility evidence, a clean full validation run, and evidence bound to the
full 40-character Resident Workforce OS release SHA.

## Approval

Required owner: the named Platform Contract Kit owner. Security and Resident Workforce OS
engineering must verify provenance and boundary compatibility, but neither may invent or
self-approve v1.1.
