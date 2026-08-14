# JobLop — Staging & Launch Runbooks

Candidate: `43bc784ddd094f19427a8c847d6946d29858fd9f`. All steps are **owner-gated** and require the
confirmed JobLop GCP identity (NOT `info@sybnb.app` until confirmed). No step here is authorized to
run yet. Budget: GitHub Actions $25/mo, stop-at-limit=yes — avoid retries; diagnose failures first.

## R1 — Publish immutable images
Precondition: WIF `approved_release_sha` == `43bc784…` (see owner checklist R0). Then:
```bash
gh workflow run "Publish Staging Images" --ref main \
  -f release_sha=43bc784ddd094f19427a8c847d6946d29858fd9f \
  -f approval_reference=RWOS-IMAGE-PUBLISH-2026-08-14-00X \  # FRESH envelope
  -f confirmation=PUBLISH_EIGHT_IMAGES_NO_DEPLOY
```
Verify: `gh run watch <id>`; the `authorize` job binds to the exact SHA. On success, confirm all 8
registry digests reference `43bc784` (Artifact Registry `rwos-stg-ca-tor-containers`). **No deploy**
occurs from this workflow. If it fails at GCP auth (`rejected by the attribute condition`), the WIF
pin is not `43bc784` — stop, fix R0, do not retry blindly.

## R2 — Deploy & align all 9 services
Runtime Terraform apply pins every Cloud Run service to the `43bc784` images:
```bash
cd infrastructure/staging/runtime
terraform init -backend-config=bucket=<state-bucket> -backend-config=prefix=terraform/plan-b-runtime
terraform plan -var release_sha=43bc784… -out plan.tfplan   # REVIEW first
terraform apply plan.tfplan                                 # owner-authorized only
```
Verify each service revision + image digest == `43bc784`; no service left on a stale release.

## R3 — Health / readiness
```bash
for h in api worker employer admin; do curl -fsS https://$h.staging.sybnb.app/health; done
curl -fsS https://api.staging.sybnb.app/ready
```
Confirm 200s, DB + Redis connectivity (api `/ready`), and service-to-service (candidate-source /
offer-delivery paired HTTPS integrations). Any non-200 → stop, diagnose, do not proceed to load.

## R4 — qa-reset recovery (resolve RWOS_QA_RESET_PERSISTENCE_CONFLICT)
Governed sequence — inspect before mutating:
1. Read current qa-reset manifest + persistence state (do NOT delete yet).
2. Identify the exact stale receipt/lock causing the 409 durable-state conflict.
3. Minimum governed cleanup only; preserve an audit record of what was removed and why.
4. Prove the full cycle: **dry-run → prepare → cleanup → verify clean synthetic state**.
No production data deleted; no safety control bypassed.

## R5 — Staging load (progressive) + soak
Reuse the committed harness (`tests/performance/`). Against staging origins (not localhost):
```bash
DATABASE_URL=<staging-readonly-or-metrics> PERF_BASE_URL=https://api.staging.sybnb.app \
  PERF_CONCURRENCY=250 PERF_DURATION_MS=180000 PERF_STAGE=stg_250 npx tsx tests/performance/loadHarness.ts
# then 500; then 1000 ONLY if 500 stays within SLO; then soak at highest clean stage.
```
Capture per stage: RPS, p50/p95/p99, error/timeout rate, instance CPU/mem, **autoscaling behavior**
(Cloud Run instance count), DB connections, pool waits, locks, slow queries, backlog after stop.
Re-prove under load: tenant isolation (cross-org 403), payroll/financial invariants (no duplicate
effects, idempotent). Local single-instance envelope for reference: ~250 clean / ~1,000 RPS / p95
46ms. Staging proves horizontal scaling. **Stop increasing at the first saturated/unsafe stage** and
report the safe ceiling.

## R6 — Deployed browser certification
Against the deployed candidate (not localhost), certify Worker / Employer / Admin: sign-in,
search/feed, applications/offers, **offer accept/decline**, attendance/time, payroll visibility,
permissions/tenant isolation, desktop + mobile rendering, no broken links / console errors /
network failures. Browser failure = launch defect even if API tests pass.

## R7 — Rollback
Images are immutable + SHA-tagged, so rollback = redeploy the previous good SHA:
```bash
cd infrastructure/staging/runtime
terraform plan -var release_sha=<previous-good-sha> -out rollback.tfplan   # REVIEW
terraform apply rollback.tfplan
```
Verify all 9 services report the rollback SHA + healthy. DB: forward-only migrations — a rollback of
code must be compatible with the already-applied schema (all 35 migrations are additive except the
reviewed DROP DEFAULTs, which are backward-compatible). If a schema change is ever incompatible, use
Cloud SQL PITR (R8) — never hand-edit production data.

## R8 — Backup / restore / PITR (to witness before production)
- Cloud SQL automated backups + point-in-time recovery must be enabled and a **restore drill**
  witnessed on a throwaway clone (never the live instance).
- Document RPO/RTO from the drill. Store the restore command + verified timing here after the drill.

## R9 — Incident response
1. Detect: alert (5xx rate, latency SLO breach, health failing, pool saturation).
2. Triage: identify blast radius; check `/ready`, DB connections, recent deploy SHA.
3. Contain: R7 rollback to last good SHA if a deploy caused it; scale instances if load-driven.
4. Communicate: owner-approved status only; no automated external comms.
5. Recover: restore from PITR only if data integrity is compromised (owner-authorized).
6. Post-incident: record timeline, root cause, and the smallest durable fix; add regression.

## Reserved boundaries (never automated)
Public DNS/production cutover, real customer PII import, real money movement, destructive production
DB ops, production secret activation, purchasing services — all owner-only, explicit, per-action.
