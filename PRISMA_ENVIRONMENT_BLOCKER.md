# Prisma Environment Blocker

## 1. Environment

Repository:

`/Users/mohamedalmashhour/Documents/Codex/2026-07-09/hi/RESIDENT_WORKFORCE_OS_ENHANCED/resident-workforce-os`

Current HEAD:

`6ef4d05`

Operating environment observed during diagnosis:

- Operating system: macOS Darwin arm64
- Shell: `/bin/zsh`
- Node.js: `v20.20.2`
- pnpm: `10.33.2`
- Execution context: Codex managed execution environment

## 2. Prisma Versions

Observed Prisma versions:

- Prisma CLI: `7.9.0`
- Prisma Client: `7.9.0`
- Query Compiler: enabled
- PSL: `@prisma/prisma-schema-wasm 7.9.0-1.e922089b7d7502aff4249d5da3420f6fa55fc6ad`

## 3. Schema Engine Version

Schema engine:

`schema-engine-cli e922089b7d7502aff4249d5da3420f6fa55fc6ad`

Binary:

`schema-engine-darwin-arm64`

Binary type:

Mach-O 64-bit executable arm64

## 4. PostgreSQL Version

Observed PostgreSQL installation:

- PostgreSQL: `17.9`
- Provider: Homebrew
- Server command: `/opt/homebrew/opt/postgresql@17/bin/postgres -D /opt/homebrew/var/postgresql@17`
- Port: `5432`
- `listen_addresses`: `localhost`
- Unix socket directory: `/tmp`
- SSL: `off`
- Local authentication: `trust`
- IPv4 local authentication: `127.0.0.1/32 trust`
- IPv6 local authentication: `::1/128 trust`

## 5. DATABASE_URL Pattern

Sanitized disposable validation pattern:

```text
postgresql://<local-dev-user>@127.0.0.1:5432/<disposable_validation_database>
```

No production database credentials were used.

No production database was modified.

## 6. Successful psql Connectivity

`psql` successfully connected to PostgreSQL using:

- `127.0.0.1`
- `localhost`
- Unix socket through `/tmp`

Successful TCP verification returned:

```text
current_user: <local-dev-user>
inet_server_addr: 127.0.0.1
inet_server_port: 5432
current_database: <disposable_validation_database>
```

This confirms PostgreSQL was running and reachable through ordinary PostgreSQL client tooling.

## 7. Failed Prisma Connectivity

The required Prisma acceptance command failed:

```bash
DATABASE_URL='postgresql://<local-dev-user>@127.0.0.1:5432/<disposable_validation_database>' \
pnpm --filter @rwos/database prisma:migrate:deploy
```

Observed result:

```text
Error: P1001: Can't reach database server at `127.0.0.1:5432`
```

Additional Prisma commands also failed:

- `prisma migrate status`
- `prisma db execute`
- direct Prisma execution from `packages/database`
- repository package script execution through `pnpm --filter`

Connection-string variants tested included:

- `127.0.0.1`
- `localhost`
- explicit `sslmode=disable`
- explicit `schema=public`
- explicit `connect_timeout`
- Unix-socket-style URL

The failure remained isolated to Prisma schema-engine database access.

## 8. Minimal Reproduction

A disposable one-table Prisma reproduction was created outside the tracked repository under `/private/tmp`.

It used:

- the same Prisma version
- the same Prisma schema engine
- the same local PostgreSQL server
- one minimal model
- one minimal SQL migration
- a disposable PostgreSQL database

Result:

```text
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "<minimal_repro_database>", schema "public" at "127.0.0.1:5432"

Error: Schema engine error:
```

`prisma db execute` in the minimal reproduction also returned P1001.

The reproduction was removed after diagnosis.

## 9. Repository Impact

The Timesheet Foundation implementation remains preserved and uncommitted.

Repository validations passed before the infrastructure freeze:

- Prisma format
- Prisma validate
- Prisma generate
- targeted database tests
- targeted authorization tests
- targeted Timesheet API/service tests
- full repository typecheck
- full repository lint
- full repository tests: `56 files / 349 tests`
- build
- `validate:env`
- `validate:boundaries`
- `scan:secrets`
- targeted Prettier
- `git diff --check`

The only blocking acceptance item is Prisma Migrate deployment against a disposable PostgreSQL database.

## 10. Why This Is Infrastructure Rather Than Application Code

The blocker is classified as infrastructure because:

1. PostgreSQL is reachable through `psql` using the same host and port.
2. Prisma schema validation succeeds.
3. Prisma client generation succeeds.
4. Repository tests pass.
5. Repository build passes.
6. The full ordered SQL migration chain was previously validated through `psql`.
7. The failure reproduces in a minimal one-table Prisma project outside the repository.
8. The failure occurs before Prisma can apply the Timesheet migration.

These facts rule out the Timesheet schema as the best-supported root cause.

Best-supported diagnosis:

The Codex managed execution environment permits `psql` to reach local PostgreSQL, but Prisma's native schema-engine subprocess cannot reach the same local PostgreSQL listener.

## 11. Recommended Owner Actions

Run the Prisma Migrate validation from a normal local macOS Terminal outside the Codex managed execution context.

Recommended sequence from the repository root:

```bash
cd "/Users/mohamedalmashhour/Documents/Codex/2026-07-09/hi/RESIDENT_WORKFORCE_OS_ENHANCED/resident-workforce-os"
```

Create a disposable validation database:

```bash
psql postgresql://localhost:5432/postgres \
  -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS resident_job_timesheet_validation;" \
  -c "CREATE DATABASE resident_job_timesheet_validation OWNER mohamedalmashhour;"
```

Set the disposable database URL:

```bash
export DATABASE_URL="postgresql://mohamedalmashhour@127.0.0.1:5432/resident_job_timesheet_validation"
```

Verify direct connectivity:

```bash
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -c "select current_user, inet_server_addr(), inet_server_port(), current_database();"
```

Run the required acceptance command:

```bash
pnpm --filter @rwos/database prisma:migrate:deploy
```

Run seed idempotency:

```bash
pnpm --filter @rwos/database prisma:seed
pnpm --filter @rwos/database prisma:seed
```

Run repository validation:

```bash
pnpm --filter @rwos/database prisma:format
pnpm --filter @rwos/database prisma:validate
pnpm --filter @rwos/database prisma:generate
pnpm --filter @rwos/database exec vitest run src/catalogue.test.ts src/schema-boundary.test.ts
pnpm --filter @rwos/auth exec vitest run src/index.test.ts
pnpm --filter @rwos/api exec vitest run src/app.test.ts
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm validate:env
pnpm validate:boundaries
pnpm scan:secrets
git diff --check
```

Optional cleanup:

```bash
psql postgresql://localhost:5432/postgres \
  -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS resident_job_timesheet_validation;"
```

## 12. Expected Acceptance Criteria

The infrastructure blocker is cleared only when:

1. `pnpm --filter @rwos/database prisma:migrate:deploy` succeeds against a clean disposable PostgreSQL database.
2. The full migration chain is applied, including `20260725050000_timesheet_foundation`.
3. `_prisma_migrations` contains the expected migration history.
4. `timesheets` exists.
5. `timesheet_calculation_snapshots` exists.
6. `TimesheetStatus` exists.
7. Timesheet indexes, foreign keys, uniqueness constraints, and version fields exist.
8. No Payroll, Finance, Invoice, Payment, Tax, or financial handoff persistence entities are created.
9. Seed runs twice without duplicating permissions or role mappings.
10. Repository validation passes.

## Timesheet Readiness Status

The current Timesheet implementation is recorded as:

```text
READY FOR VALIDATION
PENDING INFRASTRUCTURE
```

No implementation commits should be created until Prisma Migrate deployment succeeds or the owner explicitly waives that requirement.
