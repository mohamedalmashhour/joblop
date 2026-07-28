# Resident Workforce OS External Gate Handoff

`LAUNCH_READINESS.md` is the only authoritative status matrix. This handoff provides execution
inputs only and intentionally contains no second status field.

| Gate                | Required external input                                                   | Exact execution source                                    | Evidence returned                                                   | Owner               |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| P1 Production DB    | Authoritative read-only diagnostic, production SHA, approved baseline     | `DEPLOYMENT_CHECKLIST.md`                                 | ID/FK types, incompatible pairs, migrations, objects and comparison | Database owner      |
| Contract Kit C3     | Signed v1.1 artifact, checksum, source commit                             | `docs/runbooks/CONTRACT_KIT_C3_V1_1_ONBOARDING.md`        | Executed C3/full-suite results and approval                         | Contract owner      |
| Staging             | Approved topology, providers, secret references, cluster IDs, release SHA | `docs/runbooks/STAGING_VALIDATION.md`                     | Health, migration, concurrency, TLS, identity and cleanup records   | Operations/Database |
| Backup/PITR         | Managed recovery point, distinct clusters, operators, release SHA         | `docs/runbooks/DATABASE_BACKUP_RESTORE_AND_MIGRATIONS.md` | Restore/verification/cleanup log and measured RPO/RTO               | Database owner      |
| Distributed limiter | Remote atomic service, secrets and two replicas                           | `docs/runbooks/DISTRIBUTED_AUTH_RATE_LIMITER.md`          | Shared-limit, restart, isolation, outage and recovery results       | Platform/Security   |
| Monitoring/incident | Thresholds, dashboards, paging and named responders                       | `docs/runbooks/API_MONITORING_AND_INCIDENT_RESPONSE.md`   | Alert/page/ack/escalation timeline and drill record                 | Operations          |
| Accessibility       | Exact build, browser/device/AT matrix and named tester                    | `ACCESSIBILITY_SIGNOFF.md`                                | Static/automated/manual/device/AT results and signoff               | Accessibility owner |
| Browser E2E         | Runner, browsers, staging accounts/tenants/providers/reset authority      | `tests/e2e/README.md`                                     | Exact-release results, artifacts and cleanup                        | QA                  |
| Native E2E          | Runner, signed builds, devices and staging inputs                         | `tests/e2e/NATIVE_E2E_REQUIREMENTS.md`                    | Exact-release device results, artifacts and cleanup                 | Mobile QA           |
| Privacy/legal       | Named policy decisions and operational-test authority                     | `PRIVACY_REVIEW.md`                                       | Dated approval and witnessed export/deletion/retention evidence     | Privacy/Legal       |
| Dependency security | SDK-upgrade/device authority or named exception approver                  | `docs/security/DEPENDENCY_ADVISORY_REVIEW_2026-07-27.md`  | Clean audit or signed, unexpired release-bound exception            | Security            |

No evidence package may include credentials, tokens, connection strings, direct contact data, or
production record contents.
