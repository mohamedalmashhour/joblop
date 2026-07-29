# Resident Workforce OS External Evidence Matrix

Status: **BLOCKED**

The authoritative status remains `LAUNCH_READINESS.md`. Local tests are not substitutes for these
external records.

| Gate                | Required external evidence                                                   | Current local evidence                                           | Missing authority/input                                 |
| ------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Production DB       | Read-only schema, FK, migration and object inventory bound to release        | Guarded diagnostic policy only                                   | Production read-only authorization and immutable target |
| Contract C3         | Signed v1.1 artifact, checksum, executable result and approval               | Intake/run policy only                                           | Contract owner and artifact                             |
| Staging             | Immutable topology, TLS, identities, migrations, provider health and cleanup | B5.1–B5.6 local auth closure, packaging, bundle and policy tests | GCP/project/billing and per-action authorization        |
| Backup/PITR         | Witnessed restore to distinct disposable target with RPO/RTO                 | Guarded rehearsal policy                                         | Database owner/witness and managed targets              |
| Rate limiter        | Two real replicas, shared Redis, restart/outage/recovery evidence            | Atomic service contract and local tests                          | Redis/Cloud Run authorization                           |
| Monitoring          | Fired/resolved alerts, delivery, acknowledgement and incident drill          | Safe endpoints and runbook                                       | Monitoring resources and named second on-call           |
| Accessibility       | Browser/device/AT results and dated human signoff                            | Static semantics/tests                                           | Devices, testers and signoff                            |
| Browser E2E         | Authenticated staging journey, artifacts and cleanup                         | Executable runner plus isolated browser QA-reset identity policy | URLs, identities, accounts and QA authority             |
| Native E2E          | Signed builds on physical iOS/Android with retained evidence                 | Distinct iOS/Android identities plus Maestro runner/requirements | Signed builds, devices, identities and QA authority     |
| Privacy/legal       | Approved policies and exercised export/deletion/hold behavior                | Technical inventory/boundaries                                   | Named legal/privacy decisions                           |
| Dependency security | Current registry audit or approved exception                                 | Frozen pnpm lock verification; current-release audit unavailable | Run authorized audits against the reviewed lockfile     |

Local readiness remains **0 of 11 gates GREEN (0%)**. Completing B5.1–B5.6 does not manufacture
provider, device, legal, database, recovery, monitoring or human evidence.

## External staging sequence

Each numbered action needs separate authorization and stops before the next external write:

1. Approve exact release SHA and owner roles.
2. Approve GCP project/account and billing ceiling; create the isolated project.
3. Record project number and enable only approved APIs.
4. Create regional service identities and Secret Manager resources without entering values into
   source control.
5. Create isolated networking, Cloud SQL, Redis, evidence bucket and monitoring resources.
6. Build immutable images from the exact SHA and record digests/provenance.
7. Attach service identities and exact receiver-level Invoker grants.
8. Apply migrations to the staging-only database after database witness approval.
9. Create synthetic Tenant A/B identities and approved QA manifest.
10. Run readiness, IAM negative tests, browser/native E2E, concurrency and cleanup.
11. Execute backup/PITR and monitoring/incident drills.
12. Collect privacy, accessibility, security and release signoffs.

## Rollback and cleanup

Abort on any target mismatch, wrong audience/caller, migration drift, unexpected record, failed
readiness, privacy leak or unknown mutation outcome. Set traffic to zero only under deployment
authority, preserve logs/evidence, revoke temporary Invoker/secret grants, block QA reset retries,
restore only to a distinct approved target, and obtain database/security review before resuming.
Delete synthetic records through the approved manifest cleanup, verify unrelated records remain,
then remove staging resources in reverse dependency order after evidence retention approval.
