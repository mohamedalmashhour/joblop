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

cd /app/apps/api && exec pnpm start
