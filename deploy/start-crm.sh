#!/bin/sh
# Render start command for the CRM (staff pipeline + contacts) web service. Single no-space path in
# Render's "Docker Command" avoids inline shell-operator parsing problems. No DB/migrations here;
# the CRM app is a thin front end that talks to the API (INTERNAL_API_ORIGIN). Payments/finance stay
# OFF and nothing here sends marketing email.
set -e
cd /app/apps/crm && exec pnpm start
