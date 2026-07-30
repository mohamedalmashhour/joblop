# Exact Staging Input Checklist

Status: **INPUTS NOT PROVIDED — DEPLOYMENT NOT AUTHORIZED — LOCAL READY**

Record references and identifiers only in approved systems. Never record secret values here.

## Owner-provided inputs

- [ ] Exact GCP project ID: __________
- [ ] Immutable GCP project number: __________
- [ ] Region explicitly confirmed as `northamerica-northeast2` (Toronto): __________
- [ ] Maximum monthly budget: amount __________ currency __________
- [ ] Infrastructure owner: name/title/contact reference __________
- [ ] Billing owner: name/title/contact reference __________
- [ ] Security owner: name/title/contact reference __________
- [ ] Database/QA-reset owner: name/title/contact reference __________
- [ ] Monitoring primary and secondary/on-call references: __________
- [ ] Incident commander and rollback owner: __________

## Identity and secret references

- [ ] GitHub WIF principal/repository/environment mapping: __________
- [ ] Cloud Run runtime service identities by service: __________
- [ ] Migration, QA-reset, bootstrap and deployment identities: __________
- [ ] Secret Manager reference names for database, sessions, limiter, adapters, first-admin,
      Stripe test and synthetic email: __________
- [ ] IAM least-privilege review evidence and denied-access vectors: __________

No downloaded service-account key is permitted. A reference name is not the secret value.

## Provider and data authorization

- [ ] Stripe **test** account owner and explicit test-mode approval: __________
- [ ] Stripe test account reference and approved webhook hostname: __________
- [ ] Mastercard test vectors; ACSS choice (disabled by default): __________
- [ ] Synthetic email provider, sender/domain and recipient policy: __________
- [ ] Isolated staging database authorization and immutable cluster identity: __________
- [ ] QA-reset authorization for synthetic Test Employer Organization A/B only: __________
- [ ] D1–D9 evidence references: __________

## Resilience and evidence

- [ ] Backup retention and PITR window: __________
- [ ] Approved RPO/RTO: __________
- [ ] Restore-test target, cleanup owner and evidence retention: __________
- [ ] Logging/metrics retention and alert destinations: __________
- [ ] Cost alerts, recipients, teardown date and teardown owner: __________

## Exact authorized staging sequence

1. Approve a reviewed release SHA, budget, owners, project ID/number and Toronto region.
2. Establish WIF and least-privilege identities; verify denied access. Do not use key files.
3. Create approved private network, Cloud SQL, Redis, artifact, secret, monitoring and backup
   resources within the named staging project and budget only.
4. Populate Secret Manager out of band and validate reference access without printing values.
5. Build immutable images from the approved SHA; run scans and record digests.
6. Capture a pre-migration backup/PITR point and verify the target is explicitly staging.
7. Run migrations through the one-shot migration identity; verify exact migration equality.
8. Deploy API, then Employer/Admin/Worker against the staging API origin; require health/readiness.
9. Perform the single-use first-admin ceremony and synthetic Organization A/B QA reset.
10. Enable only separately approved test providers; run authenticated E2E, isolation, replay,
    monitoring, backup/restore and rollback tests.
11. Stop promotion on any readiness, migration, isolation, identity, payment, alert or restore
    failure. Production remains excluded.

`pnpm validate:staging` is evidence validation, not deployment authority. It fails closed without
the explicit staging confirmation, immutable release SHA, distinct staging/production cluster
identities, TLS PostgreSQL target, HTTPS dependencies and monitoring endpoints.
