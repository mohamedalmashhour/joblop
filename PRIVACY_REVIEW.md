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

## Technical evidence

Code-level controls minimize employer staffing progress and worker offer/Assignment DTOs, reject
cross-tenant access, and filter credential/contact field names from structured logs. These controls
do not decide lawful basis, notices, consent, residency, records of processing, data-subject request
timelines, legal holds, or statutory retention.

There is no general-purpose data export, deletion/anonymization, retention scheduler, backup-expiry
propagation, or legal-hold engine in the current launch scope. Account closure is a governed status
transition and audit event; it must not be represented as physical deletion. Technical execution of
an owner-approved policy therefore remains a launch gate.

## Legal/privacy approval required

Before launch, privacy/legal owners must approve collection purpose, lawful basis, notice text,
retention schedule, deletion/anonymization behavior, export/correction procedure, subprocessor list,
cross-border handling, breach procedure, backup expiry, and audit-record exceptions. Operations must
then test an approved export and deletion workflow without weakening audit or legal-hold duties.

## Approval record

Status: `PENDING HUMAN APPROVAL`

The approval must name the privacy and legal owners, date the decision, identify jurisdiction and
data residency, attach the retention/deletion schedule, list subprocessors, define worker and
employer notice/consent requirements, set data-subject request timelines, define audit and
legal-hold exceptions, define backup deletion expiry, and identify breach-notification authority.
Engineering evidence cannot substitute for these decisions.

After the named owners approve the policy and operations complete the witnessed export/deletion
tests, validate the non-secret approval record with:

```sh
RWOS_EVIDENCE_GATE=privacy_legal \
RWOS_EVIDENCE_PATH='<approved evidence JSON>' \
RWOS_RELEASE_SHA='<full lowercase 40-character release SHA>' \
pnpm validate:evidence
```

The validator requires named privacy/legal owners, jurisdiction, applicable law, retention,
deletion, export, legal-hold and backup-expiry decisions, operational-test results, and final owner
approval. It cannot make those decisions.
