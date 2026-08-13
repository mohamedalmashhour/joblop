# Workstream A — Staging Provisioning Owner-Approval Package

**Read-only analysis. No infrastructure was created, modified, deployed, or destroyed. No secrets
are printed.** Path decision (owner): use the existing governed **GCP + GitHub Actions + WIF +
committed Terraform** design. Do **not** create a second environment or use ad-hoc local
`gcloud`/`terraform apply`. Target GCP project: **`resident-workforce-os-staging`** (project number
`800188428439`), region **`northamerica-northeast2`**.

## 1. Governed provisioning sequence (do not execute)
1. **Release SHA on `main`** — both workflows require the SHA to be an ancestor of `main`. `7d7d532`
   is currently on `feat/employer-contract-rates`, **not `main`** → must be merged first.
2. **Infrastructure apply** — committed Terraform `infrastructure/staging/{state-bootstrap → bootstrap → runtime}` (operator-run `terraform apply` via the deployer service account; **there is no committed deploy/apply workflow** — this is the one operator/Terraform step, state in GCS bucket `resident-workforce-os-staging-tfstate-800188428439`). Creates Cloud SQL, Redis, Cloud Run (9), Artifact Registry, Secret Manager, WIF, LB, DNS records, budget.
3. **Image publish** — `.github/workflows/publish-staging-images.yml` (WIF, **NO_DEPLOY**) builds+pushes the 8 images to Artifact Registry.
4. **Deploy images → Cloud Run** — Terraform `runtime` applies the built images to the 9 services.
5. **DNS/origins** — Terraform manages the 4 `*.staging.sybnb.app` hostnames + managed SSL + global HTTPS LB (`deploy_staging_domains=true`).
6. **qa-reset** — deployed as one of the 9 Cloud Run services (`RWOS_ENV=staging`, Postgres mode).
7. **Synthetic bootstrap** — the out-of-band/in-VPC job sets synthetic sign-in passwords.
8. **Browser certification** — `.github/workflows/staging-browser-e2e.yml` runs the authoritative suite once.

## 2. GCP identity architecture (committed, non-secret)
- WIF provider: `projects/800188428439/locations/global/workloadIdentityPools/rwos-staging-github/providers/github`
- Publisher SA (image publish): `sa-rwos-stg-publisher@resident-workforce-os-staging.iam.gserviceaccount.com`
- Browser-E2E SA: `sa-rwos-stg-browser-e2e@resident-workforce-os-staging.iam.gserviceaccount.com`
- Artifact Registry: `northamerica-northeast2` repo `rwos-stg-ca-tor-containers`
- Cloud SQL: `rwos-stg-ca-tor-pg` / db `rwos_staging` (`db-custom-1-3840`, ENTERPRISE, **ZONAL**, PD_SSD, deletion_protection=true)
- Memorystore Redis: BASIC, 1 GB
- Cloud Run: 9 services (api, worker-api, employer, admin, worker, auth-limiter, candidate-source, offer-delivery, qa-reset), each **1 vCPU / 512 MiB, min_instances=0, max=1** (scale-to-zero)
- Secret Manager: 2 secrets; 5 service accounts; global external HTTPS LB (2 forwarding rules, managed SSL); `google_billing_budget` guard (alerts at 80%).

_No IAM/resources were created or modified by this analysis._

## 3. Estimated monthly staging cost envelope
Region `northamerica-northeast2`, order-of-magnitude USD (verify against current GCP pricing before authorizing):
- Cloud SQL `db-custom-1-3840` ZONAL, 24/7: **~$55–70/mo** (dominant fixed cost)
- Memorystore Redis BASIC 1 GB, 24/7: **~$35–45/mo**
- Global HTTPS LB (2 forwarding rules) fixed: **~$35/mo**
- Cloud Run 9× (min=0 → scale-to-zero): **~$0–5/mo idle** + a few cents per E2E run
- Artifact Registry (8 images) + Secret Manager + logging/monitoring: **~$3–8/mo**

**Minimum expected (idle):** **~$130–160/mo** (Cloud SQL + Redis + LB are the always-on floor).
**Normal expected (periodic E2E):** **~$135–175/mo**.
**Main cost risk:** Cloud SQL + Redis do **not** scale to zero — they run continuously; leaving the
environment up is the recurring spend. Cloud SQL `deletion_protection=true` means teardown needs an
explicit disable. The committed billing budget provides an 80% alert guard.

## 4. Owner-approval block (copy/paste — fill with your values; formats are enforced by the workflows)
```
# Prerequisite
Merge to main:            merge 7d7d5329a21abccc46a6bf128960d6b0a9c2ed3a → main (required by both workflows)

# publish-staging-images.yml
Release SHA:              <40-char main SHA, ^[a-f0-9]{40}$>
Owner approval reference: RWOS-IMAGE-PUBLISH-YYYY-MM-DD-NNN   (^RWOS-IMAGE-PUBLISH-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{3}$)
Typed publish confirmation: PUBLISH_EIGHT_IMAGES_NO_DEPLOY

# Terraform infrastructure apply (operator, deployer SA) — no committed workflow; explicit owner go
Terraform apply approval:  <owner sign-off; git-tracked plan reviewed>  (no typed CI phrase — operator gate)

# staging-browser-e2e.yml
Release SHA:               <same 40-char main SHA>
Owner approval reference:  RWOS-BROWSER-E2E-YYYY-MM-DD-NNN  (^RWOS-BROWSER-E2E-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{3}$)
Reset manifest id:         <^[A-Za-z0-9._:/-]{12,160}$>
Reset manifest checksum:   <lowercase sha256, ^[a-f0-9]{64}$>
Dry-run approval ref:      gcp/approvals/<...>   (^gcp/approvals/[A-Za-z0-9._/-]{8,120}$)
Prepare approval ref:      gcp/approvals/<...>
Cleanup approval ref:      gcp/approvals/<...>
Typed run confirmation:    RUN_STAGING_BROWSER_E2E_ONCE
```

## 5. Release SHA
Full SHA of current baseline: **`7d7d5329a21abccc46a6bf128960d6b0a9c2ed3a`**. Both workflows require a
full 40-char SHA **that is an ancestor of `main`** — this SHA is on `feat/employer-contract-rates`,
so it must be merged to `main` before it is eligible.

## 6. DNS (Terraform-managed; do not change manually)
`worker.staging.sybnb.app`, `employer.staging.sybnb.app`, `admin.staging.sybnb.app`,
`api.staging.sybnb.app` — the Terraform `staging_domain_names` allowlist restricts to exactly these
four `*.staging.sybnb.app` hostnames; qa-reset uses its Cloud Run URL
(`rwos-stg-qa-reset-…-pd.a.run.app`). DNS zone for `sybnb.app` is owner-controlled.

## 7. Secrets readiness (30 inputs — never printed/committed)
All 30 inputs from `WORKSTREAM_A_STAGING_CERTIFICATION_CHECKLIST.md` map into GitHub **environment
`staging`** secrets (for the workflows) and GCP **Secret Manager** (for the running services, e.g.
`DATABASE_URL`, `SESSION_SECRET`, rate-limiter/candidate/offer tokens). Fixed literals
(`RWOS_E2E_CONFIRMATION`, `RWOS_E2E_RESET_SERVICE_IDENTITY=browser-e2e`, `RWOS_E2E_RESET_NAMESPACE`)
are non-secret. Generated-by-owner/operator: passwords, reset token/app-credential, manifest
id/checksum, approval references. Provider-derived: project/cluster/database/authority ids. Rotation:
owner policy. **No values are created by this analysis.**

## 8. Synthetic staging accounts (no real PII)
Roles required by the suite: worker, employer (Org A owner), admin/payroll admin, revoked user, plus
distinct tenant A / tenant B ids. Bootstrap: the out-of-band/in-VPC job that materializes synthetic
users and sets their `local_password` sign-in credentials (the same seam
`stagingE2eSyntheticPasswordBootstrap` targets — staging-gated). Not run here.

## 9. Existing-resource check (read-only)
`.staging-inputs/` (gitignored operator dir) contains prior Terraform **plans/state** artifacts
(`plan-0-state-bootstrap`, `plan-a-*`, budget-recovery logs) — indicating prior provisioning
activity, possibly partial. A definitive **live** GCP inventory requires owner-authorized cloud read
access; per the order I did **not** self-grant it or query live GCP (the active local `gcloud`
account `info@sybnb.app` must not be used ad-hoc). **Owner to confirm current live state** before apply.

## 10. Irreversible / billable actions + rollback
**Billable/irreversible on apply:** Cloud SQL creation (ongoing cost; deletion_protection), Redis
creation (ongoing cost), Cloud Run deploys, Artifact Registry image storage, Secret Manager writes,
IAM/WIF, global LB + managed SSL, DNS records. **Rollback/destroy path:** `terraform destroy` on
`runtime` then `bootstrap` (must first set Cloud SQL `deletion_protection=false`); delete published
images from Artifact Registry; the state bucket + budget remain until explicitly removed.

---
**READY FOR OWNER BILLING/DEPLOYMENT AUTHORIZATION.**

## Hard boundaries (in force until explicit owner authorization)
No Terraform apply · no Cloud Run deploy · no Cloud SQL creation · no Artifact Registry publish · no
Secret Manager writes · no IAM changes · no DNS changes · no synthetic bootstrap · no staging-browser
execution · no production changes.
