# Staging custom-domain authenticated smoke evidence — 2026-08-02

Evidence timestamp: `2026-08-02T03:40:31Z`

Repository release: `a806293e5295e2719b296b7aa3827dd32f7e91ea`

Environment: `resident-workforce-os-staging`, `northamerica-northeast2` (Toronto)

Data boundary: synthetic Test Employer Organization A/B identities only

## Decision

**GO for continued synthetic staging evaluation on the approved custom domains.**

This is not a production GO. Production, live payments, real email, real data, `joblop.com`, and
`rezekme.com` remain prohibited. The CAD 225 monthly staging ceiling remains unchanged.

## TLS, DNS, and health evidence

Google-managed certificate `rwos-stg-ca-tor-staging-domains` reported `ACTIVE` for every approved
name:

- `employer.staging.sybnb.app`
- `admin.staging.sybnb.app`
- `worker.staging.sybnb.app`
- `api.staging.sybnb.app`

Every name resolved to the reviewed load-balancer address `34.120.244.190`. For all four names:

- HTTP `/health` returned `301` to the corresponding HTTPS origin.
- HTTPS `/health` returned `200`.
- TLS certificate verification returned success (`ssl_verify_result=0`).

No production or separately owned domain was read or changed.

## Immutable API image recovery

The saved recovery plan updated only the existing API image reference used by:

- `google_cloud_run_v2_service.service["api"]`
- `google_cloud_run_v2_service.service["worker-api"]`
- `google_cloud_run_v2_job.migration[0]`

Plan scope: `0` additions, `3` in-place changes, `0` deletions.

The three workloads now reference:

`sha256:d3ef1d6f5d730d69db0d0450f3c6b25aa409800a476bb0d75ce2d22db7ac4f73`

Both services reported ready revisions and the migration job remained ready. No IAM, networking,
secret, scaling, database, Redis, DNS, or monitoring resource changed in this recovery.

## Synthetic credential boundary

The smoke run reused the four existing Secret Manager entries created for staging-only synthetic
passwords:

- `rwos-staging-e2e-employer-password`
- `rwos-staging-e2e-admin-password`
- `rwos-staging-e2e-worker-password`
- `rwos-staging-e2e-revoked-password`

Each secret had an enabled version. Secret values were read directly into process memory for the
single Playwright invocation and were not displayed, logged, copied to repository files, or written
to Terraform. The secret containers use Google-managed automatic replication and have no
secret-level public or domain-wide IAM binding. Protected smoke inputs and saved Terraform plans
remain Git-ignored, untracked, and permission `600`.

The pre-existing synthetic identities authenticated successfully, so no credential rotation or
database mutation was necessary.

## Authenticated browser evidence

Playwright Chromium ran against the deployed production builds through the approved HTTPS custom
domains. All four tests passed:

1. Employer sign-in and persisted staffing-request calendar API: PASS.
2. Platform Administrator sign-in and persisted review calendar API: PASS.
3. Worker sign-in through the dedicated Worker API and authenticated Worker surface: PASS.
4. Revoked Organization B account generic `401` denial without account-state disclosure: PASS.

Automated Axe accessibility checks on the authenticated Employer and Admin calendars passed with
zero violations. The Worker assertion confirmed that fixture/synthetic labels were not exposed in
the user-facing surface.

The run completed `4 passed` with one Chromium worker and no retries.

## Origin isolation and runtime evidence

The dedicated Worker API preflight returned:

- approved origin `https://worker.staging.sybnb.app`: `204`, with the exact
  `Access-Control-Allow-Origin` value and `Vary: Origin`;
- untrusted origin `https://untrusted.example`: `403`, with no allow-origin header.

Cloud Run logs contained zero HTTP `5xx` responses after the final smoke run.

## Infrastructure reconciliation

A fresh locked Terraform plan after the image update and smoke execution reported:

`No changes. Your infrastructure matches the configuration.`

The plan covered the remote-backed staging runtime with custom-domain deployment enabled. The
remote lock was acquired and released successfully. No apply followed the zero-drift plan.

## Classification boundary

The approved staging custom-domain gate is GREEN for synthetic testing. This evidence does not
approve or claim:

- production readiness or production deployment;
- live Stripe, Mastercard, ACSS, charges, refunds, or payment data;
- real or customer email delivery;
- real employer, worker, personal, tax, or banking data;
- changes to `joblop.com` or `rezekme.com`;
- resolution of D1–D9, Terms, Privacy, Québec tax, contract, retention, legal-hold, or specialist
  owner decisions.
