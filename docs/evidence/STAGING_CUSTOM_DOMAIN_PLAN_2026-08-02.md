# Staging custom-domain HTTPS plan — 2026-08-02

Status: **VALIDATED, NOT APPLIED**

Release SHA: `46af24c851e961c59dc80e9fdd430ae444aa4342`

Environment: `resident-workforce-os-staging`, Toronto

Authorized names:

- `employer.staging.sybnb.app`
- `admin.staging.sybnb.app`
- `worker.staging.sybnb.app`
- `api.staging.sybnb.app`

## Saved plan

- SHA-256: `90acb25b637db991fab969f8f2b17f22360d4b38caa0067590e53ff5f03942c0`
- Inventory: 16 additions, 0 changes, 0 deletions.
- IAM impact: none.
- Runtime revision impact: none.
- Database, Redis and Secret Manager impact: none.
- Production impact: none.

The additions are four Toronto serverless NEGs, four backend services, one global IPv4 address,
one Google-managed certificate, one HTTPS URL map, one HTTP-to-HTTPS redirect URL map, one HTTPS
proxy, one HTTP proxy and two global forwarding rules. The URL map routes each exact hostname to
its dedicated existing Cloud Run service.

## Validation

- Terraform formatting: PASS.
- Terraform provider schema validation with pinned `hashicorp/google` 6.50.0: PASS.
- Staging infrastructure policy tests: 9/9 PASS.
- Foundation Validation: PASS, run `30727862090`.
- Every container runtime job: PASS.
- Dependency advisory audit: PASS.
- Saved plan permissions: `600`; Git-ignored and untracked.

## Cost boundary

Google lists the first five global forwarding rules in a project as one USD 0.025/hour tier.
Using 730 hours gives a USD 18.25/month baseline before traffic and currency conversion. Google-
managed certificates within the first 100 certificates per project have no certificate-month
charge. Traffic and internet data transfer remain usage-based.

The earlier conservative total staging range was CAD 126.13–182.18/month. Adding the load-balancer
baseline can make that conservative upper bound exceed the currently authorized CAD 200/month.
The plan therefore remains unapplied until the owner either increases the ceiling or approves a
revised official estimate that remains within CAD 200. Free-trial credits and budget alerts are not
treated as hard spending controls.

Pricing references:

- https://cloud.google.com/load-balancing/pricing
- https://cloud.google.com/certificate-manager/pricing

## Controlled rollout

1. Reconfirm Foundation Validation and the exact saved-plan digest and inventory.
2. Reconfirm the approved monthly ceiling and current billing-account currency.
3. Apply only the exact saved plan under the remote Terraform lock.
4. Verify all 16 resources and require a post-apply zero-drift plan.
5. Read the reserved global IPv4 address from Terraform output without copying credentials.
6. Replace only the four existing staging hostname records in Vercel DNS with exact `A` records to
   the reserved address. Do not change `sybnb.app`, production domains or unrelated records.
7. Wait for DNS propagation and Google-managed certificate status `ACTIVE`.
8. Verify TLS hostname coverage, HTTP-to-HTTPS redirects, host routing and `/health` status.
9. Run authenticated Employer, Admin and Worker browser smoke tests and API isolation tests against
   the custom HTTPS origins using synthetic Test Employer Organization A/B data.
10. Verify new Cloud Run and load-balancer error logs and exercise the approved monitoring channel.

## Stop and rollback conditions

Stop before DNS changes if the plan digest or inventory differs, any replacement/deletion appears,
the cost ceiling is exceeded, or the certificate/domain list differs. After DNS cutover, restore
the four previous Vercel DNS records if routing, TLS or authenticated smoke fails. The verified
`run.app` endpoints remain the staging fallback throughout the rollout. Do not destroy the HTTPS
resources until DNS has been restored and propagation verified.

Production, live Stripe/ACSS, real email, real data, `joblop.com`, `rezekme.com` and production DNS
remain prohibited.
