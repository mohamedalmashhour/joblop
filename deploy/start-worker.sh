#!/bin/sh
# Render start command for the public worker (job board) service. Single no-space path in
# Render's "Docker Command" avoids inline shell-operator parsing problems. No DB/migrations here.
set -e
cd /app/apps/worker && exec pnpm start
