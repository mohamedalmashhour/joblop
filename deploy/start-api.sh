#!/bin/sh
# Render start command for the API service. A committed script (single no-space path in
# Render's "Docker Command") avoids the shell-operator parsing problems of an inline
# "cd … && … ; …" command. Runs DB migrations first, then starts the API. Payments stay OFF.
set -e
cd /app/packages/database && pnpm exec prisma migrate deploy
cd /app/apps/api && exec pnpm start
