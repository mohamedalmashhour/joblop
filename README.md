# Resident Workforce OS

Controlled engineering implementation for Resident Workforce OS.

## Product Portfolio

Phase 1 implements a shared three-product portfolio:

- **Resident Workforce OS** — the multi-organization B2B SaaS foundation for HR, scheduling,
  attendance, payroll preparation, human-supervised AI, reporting and compliance.
- **JobLop** — the employer-facing workforce and staffing product for organizations searching for
  and managing workers.
- **RezekMe** — the marketplace product, with Phase 1 limited to its worker/job vertical.

The approved scope and future-phase boundaries are recorded in
`docs/architecture/ACR-0004-PHASE-1-PRODUCT-PORTFOLIO.md`.

## Status

Phase foundations and fixture-backed review journeys are implemented. The launch safety foundation
adds fail-closed production controls, but the platform is **not production ready** and must not be
deployed until the remaining launch gates are completed and approved.

Current boundaries:

- Production mutations for dispatch, offers, assignments, attendance, and timesheets are disabled.
- Production worker entry is limited to the authenticated calendar/offer reference.
- Fixture journeys remain development/test-only.
- No statutory payroll execution, live payment execution, tax filing, real notifications,
  autonomous AI employment decisions, or worker payout is authorized. Local invoice-foundation
  work is governed by `docs/architecture/ACR-0001-INVOICE-MILESTONE.md`.
- See `RESIDENT_WORKFORCE_OS_LAUNCH_READINESS_REPORT.md` for completed controls and open gates.

## Applications

- `apps/mobile` - RezekMe workforce mobile application
- `apps/employer` - JobLop employer portal
- `apps/admin` - Resident Workforce OS shared administration portal
- `apps/api` - TypeScript API shell with health endpoint

## Packages

- `packages/design-system`
- `packages/ui`
- `packages/shared`
- `packages/config`
- `packages/auth`
- `packages/database`
- `packages/validation`
- `packages/notifications`
- `packages/observability`

## Validation

```bash
pnpm install
pnpm validate
```

## Governance

Changes remain governed by the approved phase boundaries, C1 no-economics-leak, C3 pending contract
kit v1.1, privacy separation, and attendance-handoff-only scope.
