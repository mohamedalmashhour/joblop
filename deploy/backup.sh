#!/usr/bin/env bash
# Nightly backup: dump every database from the Postgres container to the 12 TB drive, keep 30 days,
# then copy offsite. Schedule with cron/Task Scheduler on the NAS. Part of the 3-2-1 backup rule.
# Edit the two paths and the offsite step for your machine. Test a RESTORE monthly.
set -euo pipefail

BACKUP_DIR="/Volumes/12TB/joblop-backups"          # <-- the 12 TB external drive
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[$(date)] dumping databases…"
# Dump all databases in the container (plain pg_dumpall; swap for per-db pg_dump if you prefer).
$COMPOSE exec -T postgres pg_dumpall -U "${POSTGRES_USER:-joblop}" | gzip > "$BACKUP_DIR/joblop-$STAMP.sql.gz"

echo "[$(date)] pruning backups older than 30 days…"
find "$BACKUP_DIR" -name 'joblop-*.sql.gz' -mtime +30 -delete

# OFFSITE copy (the "1" in 3-2-1). Uncomment and set one of these:
#   rclone copy "$BACKUP_DIR/joblop-$STAMP.sql.gz" remote:joblop-backups   # encrypted cloud bucket
#   cp "$BACKUP_DIR/joblop-$STAMP.sql.gz" /Volumes/OffsiteDrive/            # a drive you rotate off-site

echo "[$(date)] backup done: joblop-$STAMP.sql.gz"
