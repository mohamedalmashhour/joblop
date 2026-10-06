#!/usr/bin/env bash
# Stop the JobLop stack (keeps the database volume). Use --wipe to also delete data.
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
if [ "${1:-}" = "--wipe" ]; then
  echo "==> Stopping and DELETING the database volume…"; docker compose down -v
else
  echo "==> Stopping (database preserved)…"; docker compose down
fi
