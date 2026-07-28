# Resident Workforce OS Deployment Checklist

Deployment is not authorized.

- [ ] `RWOS_TEST_DATABASE_URL=<approved-target> RWOS_TEST_DATABASE_CLUSTER_ID=<staging-id>
RWOS_PRODUCTION_DATABASE_CLUSTER_ID=<production-id>
RWOS_TEST_DATABASE_CONFIRMATION=disposable-test-target pnpm test:postgres:required` passes
      against the designated PostgreSQL validation database.
- [ ] `LAUNCH_READINESS.md` has no blocking open gate.
- [ ] Exact commit and immutable build artifacts identified.
- [ ] Full validation, PostgreSQL, browser, native, accessibility, security, and dependency evidence
      attached.
- [ ] Candidate-source, delivery, limiter, database, monitoring, paging, and secret-manager
      integrations verified in the target environment.
- [ ] Backup/PITR restore evidence includes measured RPO/RTO.
- [ ] Privacy, retention, deletion, legal, accessibility, security, and C3 approvals recorded.
- [ ] Named primary/secondary on-call and incident commander assigned.
- [ ] Production mutation kill switches independently checked.
- [ ] Rollback, traffic drain, observation window, and abort thresholds approved.
- [ ] Deployment owner records explicit approval.

Codex must not deploy, create production credentials, edit real environment files, enable disabled
mutations, or infer approval from green tests.
