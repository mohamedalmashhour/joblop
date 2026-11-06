#!/usr/bin/env bash
# JobLop / Resident Workforce OS — LOCAL full-stack boot (interactive).
# Boots API + employer + worker + admin against a disposable seeded Postgres DB,
# then STAYS RUNNING so you (and Claude) can click through real user flows.
# Press Ctrl-C to stop everything and drop the throwaway database.
#
# Run in your Mac Terminal:  cd "/Volumes/Danny SSD/Codex/resident-workforce-os" && bash boot-local-stack.sh
set -uo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
ROOT="$(pwd)"
LOGDIR="$ROOT/.local-stack-logs"; mkdir -p "$LOGDIR"
INFO="$ROOT/local-stack-info.txt"

API_PORT=4100; EMPLOYER_PORT=8081; ADMIN_PORT=8082; WORKER_PORT=8090
PGUSER_NAME="${USER:-postgres}"; PGHOST="localhost"; PGPORT="5432"
DB="rwos_local_dev_$(date +%s)"
export DATABASE_URL="postgresql://${PGUSER_NAME}@${PGHOST}:${PGPORT}/${DB}"
export INTERNAL_API_ORIGIN="http://127.0.0.1:${API_PORT}"
export RWOS_ENV="local"; export NODE_ENV="development"
# Worker offer notifications use Brevo. Secret lives in the gitignored .brevo.capsule.local (NEVER
# committed), which exports BREVO_API_KEY and EMAIL_FROM; without it offer emails stay off locally.
if [ -f "$ROOT/.brevo.capsule.local" ]; then . "$ROOT/.brevo.capsule.local"; echo "  Brevo capsule loaded (offer emails enabled)"; else echo "  Brevo capsule absent (offer emails stay in dev exposeLocalCode mode)"; fi
# Enable the LOCAL FAKE payment provider so the full capture/close runs in the running apps
# (no Stripe). Fail-closed elsewhere: this only takes effect in local/test (see @rwos/config).
export LOCAL_PAYMENT_ENABLED="enabled"
export LOCAL_PAYMENT_WEBHOOK_SECRET="local-fake-webhook-secret-0123456789abcdef"
# Legal version display (draft ids) so /terms and /privacy show a configured version in local flow.
export TERMS_VERSION="ca-terms-draft-2026-10"
export PRIVACY_NOTICE_VERSION="ca-privacy-draft-2026-10"
# Enable signed Control Room share links locally (min 32 chars). Local/test demo secret only.
export CONTROL_ROOM_SHARE_SECRET="local-e2e-control-room-share-secret-0123456789"
# Activate the synthetic test-mode country so country-dependent flows work locally
# (currency/address/pricing, marketplace job detail, map + ETA). Local/test only.
export RWOS_COUNTRY_TEST_MODE=1
export RWOS_COUNTRY="canada-test"
export ASSIGNMENT_HANDOFF_ENABLED="enabled"

say(){ printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
fail(){ printf "\n\033[1;31mXX %s\033[0m\n" "$*"; exit 1; }

# ---------- preflight ----------
say "Preflight checks"
command -v node >/dev/null || fail "node not found"
echo "node $(node -v)"
PNPM="pnpm"; command -v pnpm >/dev/null || { corepack pnpm -v >/dev/null 2>&1 && PNPM="corepack pnpm"; }
$PNPM -v >/dev/null 2>&1 || fail "pnpm not found (try: corepack enable)"
echo "pnpm $($PNPM -v)"
command -v createdb >/dev/null || fail "postgres client (createdb) not found — install postgres (e.g. 'brew install postgresql@16' and start it with 'brew services start postgresql@16')"
pg_isready -h "$PGHOST" -p "$PGPORT" >/dev/null 2>&1 || fail "postgres not accepting connections on ${PGHOST}:${PGPORT} — start it (e.g. 'brew services start postgresql@16')"
echo "postgres OK on ${PGHOST}:${PGPORT}"

# ---------- free stale ports (prevents EADDRINUSE from prior runs) ----------
say "Freeing ports if held by stale processes"
for PORT in $API_PORT $WORKER_PORT $EMPLOYER_PORT $ADMIN_PORT; do
  HELD="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null)"
  if [ -n "$HELD" ]; then echo "  port $PORT held by PID(s) $HELD -> killing"; kill -9 $HELD 2>/dev/null; sleep 1; else echo "  port $PORT free"; fi
done

PIDS=()
CLEANED=0
cleanup(){ [ "$CLEANED" = "1" ] && return; CLEANED=1; say "Shutting down"; for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; sleep 2; for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill -9 "$p" 2>/dev/null; done; dropdb -h "$PGHOST" -p "$PGPORT" --force --if-exists "$DB" 2>/dev/null; echo "Dropped $DB. Bye."; }
trap cleanup EXIT
trap 'cleanup; exit 0' INT TERM

# ---------- database ----------
say "Creating disposable database $DB"
createdb -h "$PGHOST" -p "$PGPORT" "$DB" || fail "createdb failed"
say "Running migrations"
$PNPM --filter @rwos/database exec prisma migrate deploy || fail "prisma migrate deploy failed"
say "Seeding synthetic users + fixtures"
RWOS_LOCAL_E2E=enabled node --import tsx "$ROOT/local-stack-seed.ts" || fail "seed failed"

say "Seeding demo scenario (residence -> contract -> RBAC -> job)"
node --import tsx "$ROOT/local-stack-extra-seed.ts"    || echo "  (extra seed skipped — may already exist)"
node --import tsx "$ROOT/local-stack-contract-seed.ts" || echo "  (contract seed skipped)"
node --import tsx "$ROOT/local-stack-rbac-seed.ts"     || echo "  (rbac seed skipped)"
node --import tsx "$ROOT/local-stack-job-seed.ts"      || echo "  (job seed skipped)"

# ---------- launch servers ----------
launch(){ local name="$1"; shift; say "Starting $name"; ( "$@" ) >"$LOGDIR/$name.log" 2>&1 & PIDS+=($!); echo "  $name pid $! -> $LOGDIR/$name.log"; }
launch api      env API_PORT=$API_PORT $PNPM --filter @rwos/api run dev
launch worker   env PORT=$WORKER_PORT $PNPM --filter @rwos/worker run dev
launch employer env PORT=$EMPLOYER_PORT $PNPM --filter @rwos/employer exec next dev --hostname 127.0.0.1 --port $EMPLOYER_PORT
launch admin    env PORT=$ADMIN_PORT $PNPM --filter @rwos/admin exec next dev --hostname 127.0.0.1 --port $ADMIN_PORT

# ---------- wait for health ----------
wait_up(){ local url="$1"; local name="$2"; local n=0; until curl -fs -o /dev/null "$url"; do n=$((n+1)); [ $n -gt 180 ] && { echo "  $name did NOT come up — see $LOGDIR/$name.log"; return 1; }; sleep 1; done; echo "  $name UP ($url)"; }
say "Waiting for servers (first boot compiles lazily, can take 1-3 min)"
wait_up "http://127.0.0.1:${API_PORT}/health" api
wait_up "http://127.0.0.1:${WORKER_PORT}/" worker
wait_up "http://127.0.0.1:${EMPLOYER_PORT}/health" employer
wait_up "http://127.0.0.1:${ADMIN_PORT}/health" admin

cat > "$INFO" <<INFOEOF
JobLop local stack — booted $(date)
EMPLOYER : http://127.0.0.1:${EMPLOYER_PORT}   (sign in at /signin)
WORKER   : http://127.0.0.1:${WORKER_PORT}
ADMIN    : http://127.0.0.1:${ADMIN_PORT}
API      : http://127.0.0.1:${API_PORT}

Login (all share one synthetic password): ${INTERNAL_API_ORIGIN}
  password: Local-E2E-Synthetic-Pass1
  employer : employer-a@local-e2e.invalid   (Org A owner)
  worker   : worker-a@local-e2e.invalid
  platform : platform-admin@local-e2e.invalid
  payroll  : payroll-admin@local-e2e.invalid
DB: ${DB}
INFOEOF

say "STACK READY"
cat "$INFO"
echo ""
echo ">>> Leave this window open. Press Ctrl-C here when you want to stop and clean up. <<<"
# keep foreground alive
while true; do sleep 3600; done
