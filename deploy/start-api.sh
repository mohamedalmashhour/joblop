#!/bin/sh
# Render start command for the API service. A committed script (single no-space path in
# Render's "Docker Command") avoids the shell-operator parsing problems of an inline
# "cd … && … ; …" command. Runs DB migrations first, then starts the API. Payments stay OFF.
set -e
cd /app/packages/database

# Apply migrations. One migration (runtime_database_privileges) can fail on a managed provider
# whose first boot predates this fix, because the rwos_app role did not yet exist — that leaves a
# "failed" marker that blocks every later migration (Prisma P3009). Recover once by rolling that
# marker back and re-running; the fixed migration now creates the role itself. On a healthy database
# the first deploy succeeds and this recovery branch never runs.
if ! pnpm exec prisma migrate deploy; then
  echo "migrate deploy failed — attempting one-time recovery of runtime_database_privileges"
  pnpm exec prisma migrate resolve --rolled-back 20260801000000_runtime_database_privileges || true
  pnpm exec prisma migrate deploy
fi

cd /app/apps/api
# Optional one-time JobScanner populate. Set JOBSCANNER_SEED_ON_BOOT=1 to fill the external-lead store
# on boot; the seed script skips itself once the store is non-empty, so it runs at most once and never
# blocks startup (non-fatal). Scheduler stays OFF; this is the only populate path in the cloud.
if [ "${JOBSCANNER_SEED_ON_BOOT:-}" = "1" ]; then
  echo "JOBSCANNER_SEED_ON_BOOT=1 — running bounded JobScanner populate (idempotent)"
  pnpm jobscanner:seed || echo "jobscanner:seed failed (non-fatal) — continuing startup"
fi

exec pnpm start
