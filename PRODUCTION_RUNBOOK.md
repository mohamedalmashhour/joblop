# Resident Workforce OS Production Runbook

Status: prepared for operator review; no deployment is authorized.

## Before traffic

1. Use the exact reviewed commit and immutable artifacts.
2. Complete every blocking row in `LAUNCH_READINESS.md`.
3. Supply configuration only through the approved secret manager. Never create or edit a real
   `.env` file from this repository.
4. Validate `RWOS_ENV=production`, `NODE_ENV=production`, explicit `DATABASE_URL`, HTTPS
   `INTERNAL_API_ORIGIN`, and the distributed authentication limiter settings.
5. When enabled, candidate-source and offer-delivery origins must be HTTPS and paired with their
   tokens. Absence means the integration remains unavailable; it never means success.
6. Confirm fixture flags and synthetic repositories are absent from production artifacts.
7. Confirm all existing production mutation kill switches remain active.

## Preflight

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm scan:secrets`,
`pnpm validate:env`, `pnpm validate:boundaries`, `pnpm validate:migrations`, and
`git diff --check`. Run the authorized dependency audit and production-like PostgreSQL/browser/native
tests. Archive non-secret results against the release identifier.

## Runtime verification

- `/health` must return 200 without proving dependency readiness.
- `/ready` must return 200 only while database and distributed limiter checks succeed.
- Verify one authenticated read-only employer, administrator, and worker request.
- Verify anonymous, wrong-role, cross-tenant, revoked, and expired access are denied.
- Verify every production-disabled mutation returns the generic unavailable/not-found response.
- Verify logs contain normalized routes and request IDs but no credentials, contacts, tenant IDs, or
  worker identifiers.

## Stop conditions

Stop traffic promotion for readiness failure, unexpected mutation availability, privacy leakage,
unexplained 5xx growth, failed backup evidence, migration mismatch, limiter failure, or provider
delivery ambiguity. Do not bypass a kill switch or replay an uncertain mutation.

Recovery and incident procedures are in `BACKUP_RESTORE.md` and `INCIDENT_RESPONSE.md`.
