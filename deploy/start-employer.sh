#!/bin/sh
# Render start command for the employer (client-facing) web service. Single no-space path in
# Render's "Docker Command" avoids inline shell-operator parsing problems. No DB/migrations here;
# the employer app talks to the API (INTERNAL_API_ORIGIN). Payments/finance stay OFF.
set -e
cd /app/apps/employer && exec pnpm start
