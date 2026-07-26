# Prisma Schema Engine Root Cause Analysis

## 1. Executive Summary

Engineering remains paused.

The Timesheet Foundation implementation is complete and preserved, but Prisma deployment validation remains blocked by an infrastructure issue. The observed failure is that `psql` can reach local PostgreSQL successfully, while Prisma's native schema engine returns `P1001` against the same host, port, and disposable database.

The strongest conclusion supported by current evidence is:

The Codex managed execution environment permits ordinary PostgreSQL client access through `psql`, but Prisma's schema-engine subprocess cannot reach the same local PostgreSQL listener.

This is not currently classified as:

- a Timesheet schema defect
- a Timesheet migration defect
- a repository migration-chain defect
- an application service defect
- a permission model defect

Readiness status:

```text
TIMESHEET IMPLEMENTATION COMPLETE
READY FOR VALIDATION
INFRASTRUCTURE VALIDATION PENDING
```

## 2. Timeline of Investigation

1. Timesheet Foundation was implemented but not committed.
2. Repository validation passed, including typecheck, lint, tests, build, environment validation, boundary validation, secret scan, and targeted formatting.
3. `pnpm --filter @rwos/database prisma:migrate:deploy` failed with a generic schema-engine error.
4. `prisma db pull` and `prisma db execute` returned `P1001`, reporting that Prisma could not reach PostgreSQL.
5. Direct `psql` connections to the same PostgreSQL server succeeded.
6. A disposable PostgreSQL validation database was created.
7. `psql` confirmed TCP connectivity to the disposable database on `127.0.0.1:5432`.
8. Prisma Migrate still returned `P1001` against the same disposable database URL.
9. Connection-string variants were tested without resolving the failure.
10. Prisma diagnostic logging confirmed the CLI started `schema-engine-darwin-arm64` and sent a database RPC to the expected URL.
11. The schema engine returned `P1001`.
12. A minimal one-table Prisma reproduction outside the repository reproduced the same failure.
13. The blocker was classified as infrastructure validation, not application implementation.

## 3. Environment Information

Repository:

```text
/Users/mohamedalmashhour/Documents/Codex/2026-07-09/hi/RESIDENT_WORKFORCE_OS_ENHANCED/resident-workforce-os
```

Current HEAD:

```text
6ef4d05
```

Observed execution context:

- Operating system: macOS Darwin arm64
- Shell: `/bin/zsh`
- Node.js: `v20.20.2`
- pnpm: `10.33.2`
- Execution context: Codex managed execution environment

Prisma:

- Prisma CLI: `7.9.0`
- Prisma Client: `7.9.0`
- Query Compiler: enabled
- PSL: `@prisma/prisma-schema-wasm 7.9.0-1.e922089b7d7502aff4249d5da3420f6fa55fc6ad`

Prisma schema engine:

- Engine: `schema-engine-cli e922089b7d7502aff4249d5da3420f6fa55fc6ad`
- Binary: `schema-engine-darwin-arm64`
- Binary type: Mach-O 64-bit executable arm64
- Binary path: `node_modules/.pnpm/@prisma+engines@7.9.0/node_modules/@prisma/engines/schema-engine-darwin-arm64`

## 4. PostgreSQL Verification

Observed PostgreSQL installation:

- PostgreSQL: `17.9`
- Provider: Homebrew
- Server command: `/opt/homebrew/opt/postgresql@17/bin/postgres -D /opt/homebrew/var/postgresql@17`
- Port: `5432`
- `listen_addresses`: `localhost`
- Unix socket directory: `/tmp`
- SSL: `off`
- `pg_hba.conf`: `/opt/homebrew/var/postgresql@17/pg_hba.conf`
- Local authentication: `trust`
- IPv4 local authentication: `127.0.0.1/32 trust`
- IPv6 local authentication: `::1/128 trust`

PostgreSQL was verified as running. The server accepted local client connections through `psql`.

## 5. psql Verification

`psql` successfully connected through:

- IPv4 TCP: `127.0.0.1:5432`
- Hostname: `localhost:5432`
- Unix socket: `/tmp`

The successful disposable database verification returned:

```text
current_user: <local-dev-user>
inet_server_addr: 127.0.0.1
inet_server_port: 5432
current_database: <disposable_validation_database>
```

This proves that PostgreSQL was running and reachable from the same general machine environment through normal PostgreSQL client tooling.

## 6. Prisma Verification

The required acceptance command failed:

```bash
DATABASE_URL='postgresql://<local-dev-user>@127.0.0.1:5432/<disposable_validation_database>' \
pnpm --filter @rwos/database prisma:migrate:deploy
```

Observed failure:

```text
Error: P1001: Can't reach database server at `127.0.0.1:5432`
```

Additional Prisma commands also failed:

- `prisma migrate status`
- `prisma db execute`
- direct Prisma execution from `packages/database`
- repository package-script execution through `pnpm --filter`

Connection-string variants tested:

- `127.0.0.1`
- `localhost`
- explicit `sslmode=disable`
- explicit `schema=public`
- explicit `connect_timeout`
- Unix-socket-style URL

These variants did not resolve the Prisma schema-engine connectivity failure.

Prisma diagnostic logging showed:

```text
prisma:schemaEngine:rpc starting Schema engine with binary: .../schema-engine-darwin-arm64
prisma:schemaEngine:rpc SENDING RPC CALL ... "method":"dbExecute" ... "url":"postgresql://<local-dev-user>@127.0.0.1:5432/<database>?connect_timeout=10"
```

The schema engine then returned:

```text
P1001
Can't reach database server at `127.0.0.1:5432`
```

## 7. Minimal Reproduction

A disposable minimal Prisma project was created outside the tracked repository under `/private/tmp`.

The reproduction used:

- the same Prisma `7.9.0` workspace binary
- the same schema engine binary
- the same local PostgreSQL server
- one simple model
- one simple SQL migration
- one disposable PostgreSQL database

Result:

```text
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "<minimal_repro_database>", schema "public" at "127.0.0.1:5432"

Error: Schema engine error:
```

`prisma db execute` in the minimal reproduction also returned `P1001`.

The minimal reproduction was deleted after diagnosis.

Interpretation:

The failure is not specific to the Resident Workforce OS schema or the Timesheet migration.

## 8. Comparison of psql vs Prisma Execution Paths

`psql` path:

```text
zsh command
  -> /opt/homebrew/bin/psql
  -> local PostgreSQL TCP or Unix socket
  -> successful connection
```

Prisma path:

```text
zsh command
  -> pnpm
  -> Prisma CLI 7.9.0
  -> native schema-engine-darwin-arm64 subprocess
  -> schema-engine RPC database call
  -> P1001 connection failure
```

The important difference is that Prisma delegates database operations for migrate/status/execute to a native schema-engine subprocess. The observed failure occurs inside that subprocess path, not in the TypeScript schema parsing path.

Evidence:

- Prisma format passes.
- Prisma validate passes.
- Prisma generate passes.
- Prisma version command passes.
- Prisma database operations fail.
- `psql` database operations pass.

## 9. Possible Root Causes Ranked by Evidence

### 1. Codex sandbox or subprocess networking restriction

Rank: highest support

The schema-engine process cannot reach local PostgreSQL while `psql` can.

### 2. Prisma schema-engine local loopback behavior under this macOS/Codex environment

Rank: high support

The issue reproduces in a minimal one-table Prisma project using the same schema engine.

### 3. Repository Prisma configuration issue

Rank: low support

The same failure occurs outside the repository in the minimal reproduction.

### 4. Timesheet migration defect

Rank: low support

The Prisma engine fails before applying migrations, and the issue reproduces without the Timesheet migration.

### 5. PostgreSQL server unavailable or misconfigured

Rank: low support

`psql` successfully connects through multiple methods.

### 6. Authentication or password problem

Rank: low support

Local PostgreSQL authentication is configured as `trust`, and `psql` connects successfully.

### 7. SSL mismatch

Rank: low support

PostgreSQL SSL is off, and explicit `sslmode=disable` did not resolve the issue.

## 10. Evidence Supporting Each Hypothesis

### Sandbox or subprocess networking restriction

Supporting evidence:

- `psql` connects to `127.0.0.1:5432`.
- Prisma schema engine returns `P1001` to the same host and port.
- Debug logs show the Prisma CLI launches the native schema engine and passes the expected URL.
- A separate `tsx` probe previously failed to create an IPC pipe in the managed environment, showing at least some subprocess or IPC restrictions.
- The issue persists in a minimal reproduction outside the repository.

### Prisma schema-engine local loopback behavior

Supporting evidence:

- Prisma database operations fail, while Prisma non-database operations pass.
- Failure is tied to `schema-engine-darwin-arm64` database access.
- Minimal Prisma reproduction fails with the same error.

### Repository Prisma configuration issue

Supporting evidence:

- The repository uses `prisma.config.ts`, and Prisma reads it.
- Initial fallback configuration used a default local URL when `DATABASE_URL` was absent.

### Timesheet migration defect

Supporting evidence:

- Timesheet migration deployment has not been accepted through Prisma Migrate.

### PostgreSQL server unavailable or misconfigured

Supporting evidence:

- `pg_isready` gave a no-response result during one check.

### Authentication or password problem

Supporting evidence:

- Prisma reports a reachability error rather than applying migrations.

### SSL mismatch

Supporting evidence:

- PostgreSQL SSL is off.

## 11. Evidence Contradicting Each Hypothesis

### Sandbox or subprocess networking restriction

Contradicting evidence:

- `psql` runs from the same general shell environment and succeeds.
- The exact sandbox boundary is not directly observable from inside the session.

### Prisma schema-engine local loopback behavior

Contradicting evidence:

- No external upstream Prisma issue was confirmed during this task.
- The schema engine binary starts successfully and reports version information.

### Repository Prisma configuration issue

Contradicting evidence:

- Explicit `DATABASE_URL` values were passed.
- Prisma debug logs showed the expected URL.
- Direct package execution and `pnpm --filter` both failed.
- The minimal reproduction outside the repository failed.

### Timesheet migration defect

Contradicting evidence:

- Prisma fails on `db execute` and `migrate status`, not only Timesheet migration deployment.
- The minimal reproduction has no Timesheet schema or migration.
- The ordered SQL migration chain was previously validated through `psql`.
- Repository tests and schema validation pass.

### PostgreSQL server unavailable or misconfigured

Contradicting evidence:

- `psql` successfully connected through IPv4, hostname, and Unix socket.
- PostgreSQL server process was observed running.
- `listen_addresses`, `pg_hba.conf`, and SSL settings support local trusted connections.

### Authentication or password problem

Contradicting evidence:

- PostgreSQL local and loopback authentication use `trust`.
- `psql` connects without password failure.
- Prisma reports `P1001` reachability rather than an authentication-specific error.

### SSL mismatch

Contradicting evidence:

- Explicit `sslmode=disable` did not resolve the error.
- `psql` connected successfully with the same server SSL configuration.

## 12. Recommended Remediation Options

### Option A: Run Prisma validation in an unrestricted local Terminal

Run the documented Prisma Migrate validation from normal macOS Terminal, outside Codex's managed execution context.

Pros:

- Fastest path.
- No repository changes.
- Directly tests the required acceptance command.
- Preserves governance and implementation freeze.

Cons:

- Requires owner-run validation output before commits can be created.

### Option B: Run Prisma and PostgreSQL in the same Docker network namespace

Use an existing approved repository Docker/Compose setup if one exists, or a temporary local container environment if owner-authorized.

Pros:

- Avoids host loopback restrictions.
- Reproducible if documented carefully.

Cons:

- Could introduce tooling complexity.
- Must avoid creating new infrastructure stack without approval.

### Option C: Investigate Prisma schema-engine binary with OS-level tracing

Use tools such as process tracing or network tracing from outside Codex to inspect the schema engine's connection attempt.

Pros:

- Could identify the exact OS-level failure.

Cons:

- More time-consuming.
- May require elevated permissions.
- Does not directly advance product validation unless paired with Option A.

### Option D: Owner waiver of Prisma deployment gate

Owner explicitly waives Prisma deployment validation requirement based on passed `psql` migration-chain validation and all other repository checks.

Pros:

- Allows commits to proceed without waiting on the infrastructure blocker.

Cons:

- Weakens the migration validation standard.
- Leaves Prisma Migrate deployment unproven.
- Not recommended unless timeline pressure outweighs infrastructure rigor.

## 13. Risks of Each Option

### Option A Risks

- If normal Terminal also fails, the root cause may be a broader Prisma/PostgreSQL compatibility issue.
- Owner must capture complete logs so the repository decision remains auditable.

### Option B Risks

- Docker/container setup may drift from the local development baseline.
- Requires careful separation from production credentials and infrastructure.

### Option C Risks

- May produce low-level data that is hard to interpret.
- May distract from the simpler validation path.

### Option D Risks

- Future deployment could fail when Prisma Migrate is used in a real environment.
- Commits would be accepted without the explicit migration gate passing.

## 14. Recommended Owner Action

Recommended action:

Option A: Run Prisma validation in an unrestricted local Terminal.

Use the command sequence already documented in:

- `PRISMA_ENVIRONMENT_BLOCKER.md`
- `RESIDENT_JOB_TIMESHEET_FOUNDATION_REPORT.md`

Required owner-returned evidence:

- `pnpm --filter @rwos/database prisma:migrate:deploy` output
- `_prisma_migrations` query output
- Timesheet table and enum verification output
- two seed outputs
- final validation command summaries

If Option A succeeds, engineering may reopen only to create the five approved Timesheet commits.

If Option A fails, the next step should be a narrow infrastructure investigation outside Codex, not Timesheet redesign.

## 15. Acceptance Criteria for Reopening Engineering

Engineering may reopen only when one of the following occurs:

1. Prisma deployment validation succeeds in an unrestricted local environment.
2. The owner explicitly waives the Prisma deployment gate.

If validation succeeds, the acceptance evidence must show:

- clean disposable PostgreSQL database used
- `pnpm --filter @rwos/database prisma:migrate:deploy` passed
- full migration chain applied, including `20260725050000_timesheet_foundation`
- `_prisma_migrations` contains expected migration history
- `timesheets` table exists
- `timesheet_calculation_snapshots` table exists
- `TimesheetStatus` enum exists
- no Payroll, Finance, Invoice, Payment, Tax, or financial handoff persistence entities were created
- seed runs twice without duplicating permissions or role mappings
- repository validation passes

Until then:

```text
ENGINEERING REMAINS PAUSED
```
