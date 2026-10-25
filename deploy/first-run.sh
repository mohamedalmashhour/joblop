#!/usr/bin/env bash
# One-shot FIRST deployment of the JobLop stack (run once on the NAS/host after the drives + Docker
# are ready). Does: env sanity-check -> build image -> apply DB migrations -> start -> health-check ->
# print the DNS/Google next steps. Safe to re-run; migrations are idempotent. Payments stay OFF.
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"

COMPOSE="docker compose --env-file .env"

echo "==> 1/5  Checking config…"
if [ ! -f .env ]; then
  echo "    Missing deploy/.env. Run:  cp .env.example .env   then fill real secrets."
  echo "    Set at least: POSTGRES_PASSWORD, SESSION_SECRET, WORKER_PUBLIC_URL=https://joblop.com"
  exit 1
fi
if grep -qiE '^(FINANCE_LIVE|STRIPE_SECRET_KEY|STRIPE_LIVE)' .env; then
  echo "    REFUSING: a live finance/payment key is set in .env. Payments must stay OFF for this launch."
  exit 1
fi
echo "    .env present; finance/payments OFF. Good."

echo "==> 2/5  Building the image (first build takes several minutes)…"
$COMPOSE build

echo "==> 3/5  Applying database migrations…"
$COMPOSE run --rm api pnpm --filter @rwos/database exec prisma migrate deploy

echo "==> 4/5  Starting the stack…"
$COMPOSE up -d

echo "==> 5/5  Waiting for the API to report healthy…"
ok=0
for i in $(seq 1 60); do
  if $COMPOSE exec -T api node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "    API healthy."; ok=1; break
  fi
  sleep 3
done
$COMPOSE ps
[ "$ok" = "1" ] || { echo "    API did not become healthy in time — check: $COMPOSE logs api"; exit 1; }

cat <<'NEXT'

====================================================================
 JobLop is RUNNING locally on this host (worker:8090, employer:8091).
 Nothing is on the internet yet. To go live on joblop.com:

 1) Point the domain  (see docs/launch/GO_LIVE_JOBLOP.md)
    - Easiest: Cloudflare Tunnel -> joblop.com + www.joblop.com -> http://worker:8090
    - Or: GoDaddy A record @ -> your public IP, forward ports 80/443 (Caddy does TLS).
 2) Verify:  https://joblop.com/browse  (+ /robots.txt and /sitemap.xml)
 3) Google Search Console: add joblop.com, verify via DNS TXT, submit sitemap.xml.

 Admin console stays OFF the public internet — reach it over Tailscale only.
 Set up nightly DB backups:  ./backup.sh  (to the 8TB/12TB drives).
====================================================================
NEXT
