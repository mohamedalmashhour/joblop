# Backup → Restore Drill (Launch Readiness Area 6)

Proves a backup can actually be **restored** with data intact — "a backup is not a backup until a
restore has succeeded." Script: `scripts/infra/drill-backup-restore.sh`.

## What it does (test-safe)
- Reads the source DB only (`pg_dump -Fc`), restores into a **throwaway** temp DB, validates
  **table set + per-table row-count fingerprint**, prints PASS/FAIL, drops the temp DB.
- Never writes to the source; refuses to clobber an existing DB; `--dry-run` previews with no changes.

```bash
scripts/infra/drill-backup-restore.sh --source rwos_test            # local stack
scripts/infra/drill-backup-restore.sh --source rwos_test --dry-run  # preview only
```

Verified run (local, Postgres 17): 88 tables dumped → restored → row-count fingerprints matched exactly
→ `DRILL PASS`, temp DB auto-dropped.

## Render production drill (owner-run)
Render's managed Postgres (`joblop-db`) blocks all external connections, so a laptop cannot dump it
directly. The authoritative production drill is **owner-run from the Render dashboard**:
1. Render → **joblop-db** → **Recovery** → **Restore to a new instance** (PITR). This creates a
   *separate* DB; production is never touched.
2. Temporarily allow your IP on *that restored instance only*, then run this script against it:
   `PGPASSWORD=… scripts/infra/drill-backup-restore.sh --source <db> --host <host> --port <port> --user <user>`.
   Expect `DRILL PASS`.
3. **Delete the restored instance** + remove the temp IP allowance. Record date / timestamp / PASS in the
   ops log → Area 6 closed with production evidence.
