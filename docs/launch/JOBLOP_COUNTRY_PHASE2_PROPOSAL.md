# JobLop — Country Architecture Phase 2 Proposal (REVIEW ONLY — not implemented)

Builds on Phase 1 (`5d3b21c`). **Nothing in this document is implemented.** It is a reviewable plan;
Phase 2 begins only on explicit approval, in reviewable stages, with governed certification after
each stage, preserving `43bc784` (rollback) and `5d3b21c` (Phase-1 candidate).

## Objective
Move the remaining Canada-specific runtime behavior behind **neutral ports** in master, wire the
**selected country** at the API (and each service's) composition root, and add the **per-service
Docker packaging** so a country implementation can actually be selected at deploy time — without
moving existing files uncontrollably and without changing financial/legal/tax semantics.

## What Phase 1 already established
- Country-neutral `CountryProfile` + fail-closed `resolveCountryConfig(registry)` in master.
- Isolated `@rwos/country-syria` (gate CLOSED, incomplete) — imported by no app yet.
- API refuses to serve without a valid country (liveness-only fail-closed).
- **Gap Phase 2 closes:** the API's country registry is empty, so no country can actually run; and
  the Canada-shaped defaults (currency/timezone/address/postal/phone) are still read directly, not
  through ports.

## Proposed Phase 2 stages (each separately approved + certified)

### Stage 2a — Composition-root wiring + per-service Docker packaging (no behavior change)
- Add a small **country registry assembly** at each service composition root (start with
  `apps/api/src/server.ts`) that imports the available country package(s) and passes
  `{ syria: syriaCountryProfile, … }` into `resolveCountryConfig`. Master config stays country-free.
- Add the workspace dependency `@rwos/country-syria` to the services that select a country, and the
  matching **`COPY countries/<country>`** lines to each such service's Dockerfile (mirrors the
  existing `COPY packages/*` pattern; this is the packaging the api image needs so the dynamic
  country import resolves in-container).
- Result: `RWOS_COUNTRY=syria` becomes *recognized* but still fail-closes (`INCOMPLETE`) — proving
  the wiring without activating Syria. Ship behind the same fail-closed default.
- **Certify:** full Foundation Validation + container matrix; api image builds with the new COPY.

### Stage 2b — Extract Canada-specific behavior behind neutral ports (no behavior change)
Introduce master **ports** (interfaces) and route existing reads through them, with the current
Canada values supplied by a `countries/canada` profile/config (so tests stay green):
| Port (master) | Today (hardcoded/default) | Provided by country profile |
|---|---|---|
| `AddressPort` (postal/region validation, formatting) | `packages/shared/src/domain/canadaLocation.ts` | `countries/canada` adapter (Canadian) / `countries/syria` (Syrian) |
| `CurrencyContext` | `CAD` defaults in seeds/tests | profile `currency` |
| `TimeContext` | `America/Toronto` defaults | profile `timezone` |
| `PhoneFormatPort` | `+1`/NANP | profile `phoneCountryCode` + adapter |
| `PayrollJurisdictionAdapter` (already a seam) | CA/QC synthetic-fixture | per-country provider |
- Each extraction is behavior-preserving: the CA profile returns exactly today's values; only the
  *source* moves from inline constants to a profile-driven port. Regression must stay **1599/0**.
- The `countries/canada` implementation is created here as the neutral-master's *reference* country
  (so master carries no country assumption); it is NOT a launch market in this release.

### Stage 2c — Scaffold `countries/syria` adapters (still gate CLOSED)
- Add Syrian `AddressPort`/`PhoneFormatPort`/payroll-provider *placeholders* + DRAFT legal version
  refs under `countries/syria/`. Gate stays CLOSED; profile stays incomplete → still fail-closed.
- No real credentials, no deployment, no provider bindings.

### (Out of scope for Phase 2) Stage 3+ — Syria activation
Legal drafts finalized by counsel, targeted-sanctions screening, per-provider Syria-policy
confirmation, data-region decision, Arabic/RTL, isolated Syria deployment/secrets/DB/storage. Each is
a separate governed gate; none happens in Phase 2.

## Affected surfaces (why staged, not big-bang)
- **Imports:** `canadaLocation.ts` is imported by `apps/api/src/app.ts` (+ staging bootstrap);
  routing it through `AddressPort` touches those import sites and their tests — do it in 2b alone.
- **Tests:** hundreds assert CA/QC/CAD/America-Toronto defaults; 2b keeps them green by having the
  `countries/canada` profile return today's values. No test should change behavior, only source.
- **Migrations:** none — jurisdiction/currency/timezone are already row data (Phase 1 confirmed).
- **Docker:** only services that select a country gain a `COPY countries/<country>` line (2a);
  the other services are unaffected (mirrors how `@rwos/country-syria` is a leaf today).
- **Deployment workflows:** image builds stay country-neutral; per-country isolation is at the
  deploy/secret/DB layer under `countries/<country>/deployment` (later stage), not the image build.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Docker COPY for a new package breaks a service image (the TS6305/ordering class) | 2a adds the workspace dep + COPY for one service at a time and builds the image locally before pushing; Foundation Validation gates each stage |
| Port extraction silently changes a CA value | 2b is behavior-preserving by construction (CA profile returns today's constants); assert equality in tests; regression must stay 1599/0 |
| Test suite coupling to CA defaults | keep a `countries/canada` reference profile; never delete CA values, only relocate their source |
| Accidental Syria activation | gate stays CLOSED + profile INCOMPLETE through all of Phase 2; fail-closed resolver enforced |
| Scope creep into Syria legal/provider work | explicitly deferred to Stage 3+ (owner/counsel-gated) |

## Rollback
Each stage is additive and revertible by `git revert` of that stage's commit(s); `43bc784` and
`5d3b21c` remain preserved candidates. No migration is introduced in Phase 2, so no schema rollback.

## Approval checklist (for the owner)
1. Approve Stage 2a (wiring + Docker packaging) — or hold.
2. Approve Stage 2b (port extraction + `countries/canada` reference) — separately.
3. Confirm Phase 2 does **not** touch Syria legal/provider/deployment (deferred to Stage 3+).
