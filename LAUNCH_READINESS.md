# Resident Workforce OS Launch Readiness

Last reviewed: 2026-07-27

Verdict: **NOT READY**

This matrix separates repository evidence from external infrastructure and human approval. A green
code check is not deployment approval.

| Gate                             | Owner                    | Status | Evidence / command                                                       | Exact next action                                                         | Blocks launch |
| -------------------------------- | ------------------------ | ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------- |
| Authorization and tenant privacy | Engineering + Security   | GREEN  | `pnpm test`; authorization/API suites; independent safety review         | Repeat against staging topology                                           | Yes           |
| Candidate source                 | Integration owner        | YELLOW | adapter tests; `pnpm validate:staging` prepared                          | Supply HTTPS origin/token and retain staging probe evidence               | Yes           |
| Offer delivery                   | Integration owner        | YELLOW | delivery/idempotency tests; `pnpm validate:staging` prepared             | Supply HTTPS origin/token and prove receipt, retry and reconciliation     | Yes           |
| Assignment concurrency           | Engineering + DB owner   | YELLOW | PostgreSQL 17 races passed; isolated-database command and cleanup proven | Run `pnpm test:postgres:required` on approved target                      | Yes           |
| Browser E2E                      | QA                       | RED    | journey contract only; no executable runner/configuration                | Implement runner/browser matrix, then supply staging inputs and execute   | Yes           |
| Native E2E                       | Mobile QA                | RED    | production fixture gate tests only; no functional native runner          | Implement native E2E contract/runner, then execute signed device builds   | Yes           |
| Contract Kit C3                  | Contract owner           | RED    | v1 present; nine cases skipped; C3 onboarding runbook prepared           | Supply signed v1.1 artifact and approve zero-skip C3 result               | Yes           |
| Backup/PITR/restore              | Database owner           | YELLOW | guarded tooling and database-owner checklist                             | Witness managed restore and measure RPO/RTO                               | Yes           |
| Distributed auth limiter         | Platform + Security      | YELLOW | client/failure tests and staging validator                               | Provision shared service and prove cross-replica limits/outage behavior   | Yes           |
| Dependency security              | Security                 | RED    | registry audit: one high dev-tool advisory; exception package documented | Approve time-bounded exception or supported Expo upgrade                  | Yes           |
| Monitoring/on-call               | Operations               | YELLOW | probes, logs, role placeholders and staging validator                    | Configure dashboards/alerts/pages, name owners and run drill              | Yes           |
| Privacy/retention/deletion       | Privacy + Legal          | RED    | inventory and exact approval record prepared                             | Sign jurisdiction, notice, retention, deletion and subprocessor decisions | Yes           |
| Accessibility                    | Accessibility + QA       | YELLOW | code semantics and exact device/assistive-technology matrix              | Execute matrix and sign remaining exceptions                              | Yes           |
| Production configuration         | Engineering + Operations | YELLOW | fail-closed runtime and `pnpm validate:staging`                          | Inject approved secret references and obtain independent review           | Yes           |
| Shared-main/CI                   | Repository owner         | RED    | local `main` ahead; push forbidden                                       | Authorize push, verify remote SHA and required CI                         | Yes           |
| Deployment                       | Deployment owner         | RED    | `DEPLOYMENT_CHECKLIST.md`                                                | Close all gates and record explicit approval                              | Yes           |

The detailed implementation history remains in
`RESIDENT_WORKFORCE_OS_LAUNCH_READINESS_REPORT.md`.
