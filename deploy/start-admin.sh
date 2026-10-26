#!/bin/sh
# Render start command for the admin (control room) web service. Single no-space path in
# Render's "Docker Command" avoids inline shell-operator parsing problems. No DB/migrations here;
# the admin app talks to the API (INTERNAL_API_ORIGIN). Payments/finance stay OFF.
set -e
cd /app/apps/admin && exec pnpm start
