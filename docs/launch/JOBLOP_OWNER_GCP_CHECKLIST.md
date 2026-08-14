# JobLop — Owner GCP / Publication Checklist

Secure, owner-only steps that unblock staging. The agent will **not** run these until the identity
is confirmed. Everything below targets JobLop's own project `resident-workforce-os-staging`.

## R0.1 — Confirm the authorized JobLop identity
The current gcloud identity is `info@sybnb.app` (the shared owner account). **Confirm explicitly**
that this identity is authorized to operate JobLop staging IAM, OR designate a JobLop-specific
identity. Do not proceed on assumption — this is the SYBNB-isolation boundary.

## R0.2 — Authenticate (interactive; owner's machine)
```bash
gcloud config set account <authorized-joblop-identity>
gcloud config set project resident-workforce-os-staging
gcloud auth login                         # refreshes the CLI credential (currently expired)
gcloud auth application-default login     # refreshes ADC for Terraform
```

## R0.3 — Read-only WIF inspection (agent runs this FIRST once authed)
Confirms the pinned SHA before any change:
```bash
gcloud iam workload-identity-pools providers describe github \
  --project=resident-workforce-os-staging --location=global \
  --workload-identity-pool=rwos-staging-github --format="value(attributeCondition)"
```
Expected to reveal `... && assertion.sha == '<pinned-sha>'`. If `<pinned-sha> != 43bc784…`, that is
the confirmed publish blocker.

## R0.4 — Bootstrap variables (supply securely; no committed tfvars exists)
`infrastructure/staging/bootstrap` requires these 11 variables (validated):
| Variable | Known value | Source |
|---|---|---|
| `project_id` | `resident-workforce-os-staging` | known |
| `project_number` | `800188428439` | known |
| `region` | `northamerica-northeast2` | known |
| `github_repository` | `drmmashhour-ux/resident-workforce-os` | known |
| `github_environment` | `staging` | known |
| `state_bucket_name` | `resident-workforce-os-staging-tfstate-800188428439` | derived (`<project_id>-tfstate-<project_number>`) |
| `approved_release_sha` | **`43bc784ddd094f19427a8c847d6946d29858fd9f`** | THIS candidate |
| `billing_account` | _owner-held_ | **owner supplies** |
| `monthly_budget_cad` | _e.g. 500_ | **owner supplies / confirm** |
| `budget_notification_email` | _owner-held_ | **owner supplies** |
| `approval_reference` | dated approval string | **owner supplies** |
Provide via a secure local `terraform.tfvars` (gitignored) or `-var` flags — never commit secrets.

## R0.5 — Read-only Terraform plan (agent runs, then stops for review)
```bash
cd infrastructure/staging/bootstrap
terraform init -backend-config=bucket=resident-workforce-os-staging-tfstate-800188428439 \
               -backend-config=prefix=terraform/plan-a-bootstrap
terraform plan -var approved_release_sha=43bc784ddd094f19427a8c847d6946d29858fd9f \
               <other -var/tfvars> -out bootstrap.tfplan
```
**Review:** the plan must change **only** the WIF provider `attribute_condition`
(`assertion.sha` old→`43bc784…`) and nothing else. If it proposes any other resource change
(service accounts, buckets, IAM bindings, budgets), STOP and investigate before applying.

## R0.6 — Apply (separately authorized) — updates the SHA pin
```bash
terraform apply bootstrap.tfplan     # owner explicitly authorizes this IAM change
```

## R0.7 — Fresh publication envelope
Issue a new reference for the audit trail (do not reuse `-001`):
`RWOS-IMAGE-PUBLISH-2026-08-14-00X`. Then the agent re-runs R1 (publish) from
`JOBLOP_STAGING_RUNBOOKS.md`.

## Production secrets to provision (before production, not staging)
Enumerated from `packages/config/src/index.ts` (all fail-closed until present):
- `DATABASE_URL` (production Cloud SQL, private IP)
- `SESSION_SECRET`, `AUTH_RATE_LIMITER_KEY_SECRET` (≥32)
- `DOCUMENT_REFERENCE_SECRET` (≥32) + a **real object-storage provider** (no local disk in prod)
- `VERIFICATION_CALLBACK_SECRET` (≥32)
- Paired HTTPS integration origins + tokens (candidate-source, offer-delivery)
- NOT for launch: Stripe is test-only (`sk_test_`/`whsec_`); no live payment secret exists or is wanted.

## Hard boundaries
No public DNS cutover, no real PII, no real money, no destructive prod ops, no production secret
activation, no purchases — each is a separate explicit owner decision.
