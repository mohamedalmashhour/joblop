#!/usr/bin/env bash
# JobLop role simulation check — runs the hiring / worker / admin test suites
# Run this in your Mac Terminal:  bash run-role-sim-check.sh
set -uo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
OUT="role-sim-results.txt"
VT="node_modules/.bin/vitest"
: > "$OUT"
echo "JobLop role simulation check — $(date)" | tee -a "$OUT"
echo "node $(node -v)" >> "$OUT"
run(){ local label="$1"; shift
  echo "" | tee -a "$OUT"
  echo "=================== $label ===================" | tee -a "$OUT"
  "$VT" run "$@" --reporter=dot --passWithNoTests >> "$OUT" 2>&1
  local code=$?
  echo "[exit code: $code]" | tee -a "$OUT"
}
run "HIRING (employer app)"  apps/employer
run "WORKER (app + worker domain logic)" apps/worker \
    packages/auth/src/workerSavedJobs.test.ts \
    packages/auth/src/workerJobInterest.test.ts \
    packages/shared/src/domain/workerPayout.test.ts \
    packages/shared/src/domain/workerDispute.test.ts
run "ADMIN (admin app)" apps/admin
echo "" | tee -a "$OUT"
echo "===== SUMMARY (grepped) =====" | tee -a "$OUT"
grep -E "Test Files|Tests " "$OUT" | tee -a "$OUT"
echo "" | tee -a "$OUT"
echo "DONE — full results in $OUT" | tee -a "$OUT"
