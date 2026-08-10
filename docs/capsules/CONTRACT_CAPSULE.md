# Contract Capsule

**Employer↔platform contract + per-role rate card + governed request pricing.**

A staffing request must never *invent* a pay rate. Instead, the employer signs a
platform **contract** that holds a **rate card** (an hourly rate per role); a request
**reads** the governed rate for its chosen role. This keeps money authority in one
governed place and preserves the platform's money-governance boundary — no
`/payroll`, `/finance`, `/invoices`, `/payments`, or money-engine routes are added.

Status: **complete + verified** (schema, domain, service, API, request integration).

---

## Composition

### Core (portable — lift as-is)

- **Pricing domain** — `packages/shared/src/domain/contractPricing.ts`
  - `resolveRoleHourlyRate(rateCard, roleDefinitionId)` → the governed `MoneyAmount` for a role, or `null` if the active contract does not price it.
  - `estimateRequestCost({ hourlyRate, hours, workers })` → `MoneyAmount`.
  - `hoursBetween(startIso, endIso)`, `formatHourlyRate(money)`, `formatMoney(money)`.
  - `contractRoleHourlyRate(...)` builder; types `EmployerContractRateCard`, `ContractRoleHourlyRate`.
  - Depends only on the **money engine** (`createContractMoney`, `MoneyAmount`, `Currency`).
  - Tests: `contractPricing.test.ts` (7).

- **Service** — `packages/auth/src/employerContract.ts`
  - `createEmployerContractService(repository, membershipReader, { now? })`
    - `getActiveContract({ actorUserId, organizationId })` → `PublicEmployerContract | null`.
    - `signContract({ actorUserId, organizationId, version, currency?, roleRates })` → activates a new contract, superseding the prior active one.
  - Authz: an **active `ORGANIZATION_OWNER`/`ORGANIZATION_ADMINISTRATOR`** member (via a structural `ContractMembershipReader`).
  - Validation: versioned label, non-empty card, non-negative integer minor rates, unique roles.
  - `createPrismaEmployerContractRepository(prismaClient)` — the Prisma-backed repo.
  - `EmployerContractError` (`denied` | `invalid` | `conflict`); `PublicEmployerContract` DTO.
  - Tests: `employerContract.test.ts` (4).

### Data (copy schema + migration)

- `packages/database/prisma/schema.prisma`: models `EmployerContract`, `ContractRoleRate`, enum `EmployerContractStatus`, and the `EmployerOrganization.contracts` back-relation.
- Migration `20260809093728_employer_contract_role_rates`.

### Adapters (per-platform — rewrite thin wiring)

- **API** — `apps/api/src/app.ts`
  - `GET  /organizations/:organizationId/contract` → `{ contract }`.
  - `POST /organizations/:organizationId/contract` → sign; `{ contract }` (201).
  - Service constructed in `buildApi` (`employerContractService`); errors mapped (`denied` 401/403, `invalid` 400).
- **Request-context BFF** — `apps/employer/app/api/job-requests/context/route.ts` fetches the active contract; `parseEmployerRequestContext(..., { contract })` (`jobRequestBoundary.ts`) joins each role to its rate by `roleDefinitionId`.
- **UI** — `apps/employer/app/employer/calendar/create/CreatePersistedRequestPanel.tsx` shows the selected role's governed rate + estimated total, or a "not priced yet — sign a contract" notice.

---

## Public surface (what a new platform imports)

```ts
// from @rwos/shared
import { resolveRoleHourlyRate, estimateRequestCost, formatHourlyRate,
         hoursBetween, type EmployerContractRateCard } from "@rwos/shared";

// from @rwos/auth
import { createEmployerContractService, createPrismaEmployerContractRepository,
         EmployerContractError, type PublicEmployerContract } from "@rwos/auth";
```

## Dependencies

- Money engine (`createContractMoney` / `MoneyAmount` / `Currency`) — part of `packages/shared`.
- A membership reader exposing `listMemberships(userId) -> [{ organizationId, status, roleKeys }]` (structural; the platform's membership service satisfies it).
- A Prisma client with the `employerContract` + `contractRoleRate` delegates.

## Lift into the next platform

1. Copy the two models + enum + migration into that platform's Prisma schema.
2. `@rwos/shared` pricing domain is already portable — import it.
3. Reuse `createEmployerContractService`; point it at the new platform's membership
   reader + Prisma repo (`createPrismaEmployerContractRepository`).
4. Add the two endpoints (or the framework's equivalent) and wire the read into that
   platform's request/job-posting flow, joining role → rate by `roleDefinitionId`.

## Guarantees

- The request applies the **governed** rate; it never sets a price.
- No forbidden money-route strings are introduced — `non-money-boundary` and
  `money-retirement` tests stay green.
