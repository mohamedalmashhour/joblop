#!/usr/bin/env bash
# Bring the JobLop stack up on this Mac (build + start in the background).
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
[ -f .env ] || { echo "Missing deploy/.env — run: cp .env.example .env  then fill it in"; exit 1; }
echo "==> Building and starting (first build can take several minutes)…"
docker compose up -d --build
echo "==> Waiting for API health…"
for i in $(seq 1 60); do
  if docker compose exec -T api node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "API healthy."; break
  fi; sleep 3
done
docker compose ps
echo "==> Up. Map your hostnames in the Cloudflare tunnel if you haven't (see README)."
