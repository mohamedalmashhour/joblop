# Resident Workforce OS Deployment Checklist

Deployment is not authorized.

- [ ] `pnpm test:postgres:required` passes against the designated disposable PostgreSQL validation
      database; the command fails closed when `RWOS_TEST_DATABASE_URL` is absent.
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
