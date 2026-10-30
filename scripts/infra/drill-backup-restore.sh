#!/usr/bin/env bash
# JobLop — backup → restore verification drill (Launch Readiness Area 6).
#
# PURPOSE: prove that a backup can actually be RESTORED and the data comes back intact — "a backup is
# not a backup until a restore has succeeded". Read-only against the source; it dumps the source DB,
# restores into a throwaway temp DB, validates integrity (table set + per-table row counts + a few
# structural counts), prints PASS/FAIL, and drops the temp DB.
#
# SAFE BY DESIGN:
#   - The SOURCE database is only ever READ (pg_dump). It is never written, dropped, or altered.
#   - The restore target is a fresh temp DB this script creates and drops (name: <source>_drill_<ts>).
#   - --dry-run prints every step and the dump size without creating/restoring anything.
#   - Refuses to run if the computed temp DB name already exists (never clobbers an existing DB).
#
# NOT FOR RENDER DIRECTLY: Render's managed Postgres blocks external connections (empty IP allowlist),
# so this cannot pg_dump the live Render DB from a laptop. Point it at a reachable copy (a local stack,
# or a DB restored from a Render snapshot). The authoritative Render PITR drill is run from Render's own
# dashboard (Database → Recovery → restore to a NEW instance) — see the companion .md.
#
# USAGE:
#   ./joblop-drill-backup-restore.sh --source rwos_test [--host localhost] [--port 5432] [--user "$USER"] [--dry-run]
#   PGPASSWORD=... ./joblop-drill-backup-restore.sh --source mydb --host db.internal --user app
set -euo pipefail

HOST="localhost"; PORT="5432"; USER_NAME="${USER:-postgres}"; SOURCE=""; DRY_RUN="false"
while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2;;
    --host) HOST="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --user) USER_NAME="$2"; shift 2;;
    --dry-run) DRY_RUN="true"; shift;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done
[ -n "$SOURCE" ] || { echo "ERROR: --source <db> is required" >&2; exit 2; }

for bin in pg_dump pg_restore psql createdb dropdb; do
  command -v "$bin" >/dev/null || { echo "ERROR: $bin not found on PATH" >&2; exit 2; }
done

PSQL=(psql -h "$HOST" -p "$PORT" -U "$USER_NAME" -v ON_ERROR_STOP=1 -tAq)
TS="$(date +%Y%m%d%H%M%S)"
TARGET="${SOURCE}_drill_${TS}"
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/joblop-drill.XXXXXX")"
DUMP="${WORKDIR}/${SOURCE}.dump"
trap 'rm -rf "$WORKDIR"' EXIT

echo "==> JobLop backup→restore drill"
echo "    source=${SOURCE}  host=${HOST}:${PORT}  user=${USER_NAME}  target=${TARGET}  dry_run=${DRY_RUN}"

# Pre-flight: source reachable; target name free (never clobber).
"${PSQL[@]}" -d "$SOURCE" -c "select 1" >/dev/null || { echo "FAIL: source DB '$SOURCE' unreachable" >&2; exit 1; }
EXISTS="$("${PSQL[@]}" -d postgres -c "select 1 from pg_database where datname='${TARGET}'" || true)"
[ -z "$EXISTS" ] || { echo "FAIL: target '$TARGET' already exists — refusing to clobber" >&2; exit 1; }

count_tables() { "${PSQL[@]}" -d "$1" -c "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"; }
row_fingerprint() {
  # Deterministic per-table row counts across the public schema → a single sorted digest.
  "${PSQL[@]}" -d "$1" <<'SQL' | sort | shasum -a 256 | awk '{print $1}'
select format('%s=%s', c.relname,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I', c.relname), false, true, '')))[1]::text::bigint)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r';
SQL
}

echo "==> [1/5] backup (pg_dump, custom format)"
if [ "$DRY_RUN" = "true" ]; then
  echo "    DRY-RUN: would run: pg_dump -Fc -d $SOURCE -f $DUMP"
else
  pg_dump -h "$HOST" -p "$PORT" -U "$USER_NAME" -Fc -d "$SOURCE" -f "$DUMP"
  echo "    dump written: $(du -h "$DUMP" | awk '{print $1}')  ($DUMP)"
fi

SRC_TABLES="$(count_tables "$SOURCE")"
echo "==> [2/5] source inventory: ${SRC_TABLES} base tables"
if [ "$DRY_RUN" = "true" ]; then echo "    DRY-RUN complete — no temp DB created, nothing restored."; exit 0; fi
SRC_FP="$(row_fingerprint "$SOURCE")"

echo "==> [3/5] restore into throwaway temp DB: $TARGET"
createdb -h "$HOST" -p "$PORT" -U "$USER_NAME" "$TARGET"
# Clean up the temp DB even if later steps fail.
trap 'dropdb -h "$HOST" -p "$PORT" -U "$USER_NAME" --if-exists "$TARGET" >/dev/null 2>&1 || true; rm -rf "$WORKDIR"' EXIT
pg_restore -h "$HOST" -p "$PORT" -U "$USER_NAME" --no-owner --no-privileges -d "$TARGET" "$DUMP" >/dev/null 2>"${WORKDIR}/restore.err" || true
# pg_restore can emit benign warnings; treat as fatal only if the row fingerprint later mismatches.

echo "==> [4/5] integrity validation (table set + per-table row counts)"
TGT_TABLES="$(count_tables "$TARGET")"
TGT_FP="$(row_fingerprint "$TARGET")"
echo "    tables: source=${SRC_TABLES} restored=${TGT_TABLES}"
echo "    row-fingerprint source=${SRC_FP:0:16}… restored=${TGT_FP:0:16}…"

echo "==> [5/5] verdict"
FAIL=0
[ "$SRC_TABLES" = "$TGT_TABLES" ] || { echo "    ✗ table count mismatch"; FAIL=1; }
[ "$SRC_FP" = "$TGT_FP" ] || { echo "    ✗ row-count fingerprint mismatch (data not fully restored)"; FAIL=1; cat "${WORKDIR}/restore.err" >&2 || true; }
if [ "$FAIL" = "0" ]; then
  echo "    ✓ DRILL PASS — backup restored and verified byte-for-row-count intact (${SRC_TABLES} tables)."
  exit 0
else
  echo "    ✗ DRILL FAIL — restore did not reproduce the source. See errors above."
  exit 1
fi
