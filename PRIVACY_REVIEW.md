# Resident Workforce OS Privacy, Retention, and Deletion Review

Status: code-level inventory complete; legal/privacy decisions and operational verification are open.

| Data class           | Examples                                                               | Current purpose                 | Primary access boundary                          | Decision still required                           |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Authentication       | normalized email, password hash, sessions, audit references            | account/session security        | account owner and governed auth services         | retention, recovery, MFA, deletion exceptions     |
| Worker               | identity, approved display name, offer/response/Assignment references  | worker access and staffing      | owning worker; minimized admin operational views | retention, export, correction, deletion           |
| Employer             | organization, membership, residence, department, requests              | staffing request workflow       | active tenant membership                         | retention, organization closure/export            |
| Administrator        | role assignments and audit actor references                            | governed platform operations    | active platform roles                            | privileged-access retention and review            |
| Operational          | dispatch, candidate provenance, offers, delivery attempts, Assignments | staffing lifecycle              | role/tenant/ownership allowlists                 | lifecycle retention and failed-delivery retention |
| Attendance/timesheet | time and handoff records                                               | attendance and time-only review | separated worker/employer/admin scopes           | employment-record retention and deletion limits   |
| Logs                 | request IDs, normalized route, status, duration                        | reliability/security            | restricted operations                            | retention, access, regional storage               |
| Backups              | encrypted database recovery points                                     | resilience                      | database/security operators                      | retention, deletion propagation, legal hold       |

Code-level controls minimize employer staffing progress and worker offer/Assignment DTOs, reject
cross-tenant access, and filter credential/contact field names from structured logs. These controls
do not decide lawful basis, notices, consent, residency, records of processing, data-subject request
timelines, legal holds, or statutory retention.

Before launch, privacy/legal owners must approve collection purpose, lawful basis, notice text,
retention schedule, deletion/anonymization behavior, export/correction procedure, subprocessor list,
cross-border handling, breach procedure, backup expiry, and audit-record exceptions. Operations must
then test an approved export and deletion workflow without weakening audit or legal-hold duties.
