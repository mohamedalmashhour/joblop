# Resident Workforce OS

Controlled engineering implementation for Resident Workforce OS.

## Status

Phase foundations and fixture-backed review journeys are implemented. The launch safety foundation
adds fail-closed production controls, but the platform is **not production ready** and must not be
deployed until the remaining launch gates are completed and approved.

Current boundaries:

- Production mutations for dispatch, offers, assignments, attendance, and timesheets are disabled.
- Production worker entry is limited to the authenticated calendar/offer reference.
- Fixture journeys remain development/test-only.
- No payroll, payment execution, invoices, tax, notifications, real maps, AI execution, or worker
  payout is authorized.
- See `RESIDENT_WORKFORCE_OS_LAUNCH_READINESS_REPORT.md` for completed controls and open gates.

## Applications

- `apps/mobile` - Expo worker mobile shell
- `apps/employer` - Next.js employer portal shell
- `apps/admin` - Next.js administration shell
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
