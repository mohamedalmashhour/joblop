# Resident Workforce OS Deployment Checklist

Deployment is not authorized.

- [ ] `RWOS_TEST_DATABASE_URL=<approved-target> RWOS_TEST_DATABASE_CLUSTER_ID=<staging-id>
RWOS_PRODUCTION_DATABASE_CLUSTER_ID=<production-id>
RWOS_RELEASE_SHA=<full-lowercase-40-character-release-commit>
RWOS_TEST_DATABASE_CONFIRMATION=disposable-test-target pnpm test:postgres:required` passes
      against the designated PostgreSQL validation database.
- [ ] `LAUNCH_READINESS.md` has no blocking open gate.
- [ ] Authoritative read-only production DB baseline proves compatible IDs/FKs, migrations, and
      schema inventory against the approved development baseline.
      Execute the guarded command in `docs/runbooks/PRODUCTION_DATABASE_DIAGNOSTIC.md`; local policy
      tests do not satisfy this item.
- [ ] Exact commit and immutable build artifacts identified.
- [ ] Full validation, PostgreSQL, browser, native, accessibility, security, and dependency evidence
      attached.
- [ ] Candidate-source, delivery, limiter, database, monitoring, paging, and secret-manager
      integrations verified in the target environment.
- [ ] Cloud Run service identities, canonical audiences, exact Invoker grants, Google ID-token
      verification and public-client separation pass approved staging IAM tests.
- [ ] Backup/PITR restore evidence includes measured RPO/RTO.
- [ ] Privacy, retention, deletion, legal, accessibility, security, and C3 approvals recorded.
- [ ] Named primary/secondary on-call and incident commander assigned.
- [ ] Production mutation kill switches independently checked.
- [ ] Rollback, traffic drain, observation window, and abort thresholds approved.
- [ ] Deployment owner records explicit approval.

Codex must not deploy, create production credentials, edit real environment files, enable disabled
mutations, or infer approval from green tests.
