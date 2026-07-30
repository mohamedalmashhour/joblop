#!/usr/bin/env bash
set -euo pipefail

for required in initdb pg_ctl createdb psql; do
  command -v "$required" >/dev/null ||
    { echo "RWOS_QA_RESET_LOCAL_POSTGRES_BINARY_MISSING:$required" >&2; exit 2; }
done

qa_tmp="$(mktemp -d /tmp/rwos-qa-pg.XXXXXX)"
qa_data="$qa_tmp/data"
qa_port="$((55000 + ($$ % 1000)))"
qa_url="postgresql://${USER}@127.0.0.1:${qa_port}/rwos_validation_admin"
qa_started=0
qa_holder_pid=""

cleanup() {
  if [[ -n "$qa_holder_pid" ]]; then kill "$qa_holder_pid" 2>/dev/null || true; fi
  if [[ "$qa_started" == 1 ]]; then pg_ctl -D "$qa_data" stop -m fast >/dev/null 2>&1 || true; fi
  rm -rf "$qa_tmp"
}
trap cleanup EXIT INT TERM

initdb -D "$qa_data" --no-locale --encoding=UTF8 --auth-local=trust --auth-host=trust >/dev/null
pg_ctl -D "$qa_data" -l "$qa_tmp/postgres.log" \
  -o "-h 127.0.0.1 -p $qa_port -k $qa_tmp" start >/dev/null
qa_started=1
createdb -h 127.0.0.1 -p "$qa_port" rwos_validation_admin

DATABASE_URL="$qa_url?schema=public" pnpm --filter @rwos/database prisma:migrate:deploy >/dev/null

test "$(psql "$qa_url" -tAc \
   "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")" = 14
test "$(psql "$qa_url" -tAc \
  "SELECT count(*) FROM pg_constraint WHERE conrelid IN ('qa_reset_manifest_ownership'::regclass,'qa_reset_manifest_tenants'::regclass,'qa_reset_owned_records'::regclass,'qa_reset_control_runs'::regclass,'qa_reset_control_events'::regclass)")" = 30

psql "$qa_url" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
BEGIN;
INSERT INTO qa_reset_manifest_ownership
  (id, manifest_reference, manifest_checksum, namespace, environment, project_id, cluster_id,
   database_id, authority_id, release_sha, status, expires_at, retention_until,
   approval_reference, retention_owner_reference, created_by_caller_alias,
   created_by_principal_digest, updated_at)
VALUES
  ('00000000-0000-4000-8000-00000000abcd', 'local-rollback-proof', repeat('a',64),
   'rwos:qa-reset:staging:v1', 'staging', 'local/project', 'local/cluster', 'local/database',
   'local/authority', repeat('a',40), 'approved', now()+interval '1 day',
   now()+interval '30 days', 'local/approval', 'local/retention', 'local-test',
   repeat('b',64), now());
ROLLBACK;
SQL
test "$(psql "$qa_url" -tAc \
  "SELECT count(*) FROM qa_reset_manifest_ownership WHERE manifest_reference='local-rollback-proof'")" = 0

psql "$qa_url" -v ON_ERROR_STOP=1 -c \
  "BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('local:qa-reset-lock',0)); SELECT pg_sleep(10); COMMIT;" \
  >/dev/null &
qa_holder_pid="$!"
for _ in 1 2 3 4 5; do
  lock_result="$(psql "$qa_url" -tAc \
    "SELECT pg_try_advisory_xact_lock(hashtextextended('local:qa-reset-lock',0))")"
  [[ "$lock_result" == "f" ]] && break
  sleep 0.2
done
test "$lock_result" = f

RWOS_POSTGRES_TEST_MODE=local-disposable \
RWOS_TEST_DATABASE_URL="$qa_url" \
RWOS_TEST_DATABASE_CONFIRMATION=disposable-test-target \
pnpm test:postgres:required

echo "RWOS_QA_RESET_LOCAL_POSTGRES_VALIDATION_PASSED migrations=14 constraints=30 rollback=atomic advisory_lock=exclusive"
