# Resident Job

## Page 061 - Admin Dashboard Wireframe Revision 1

**Status:** Approved Wireframe v1.0 candidate  
**Revision:** 1  
**Owner decision:** Approved with documented conditions  
**Implementation:** Not Started  
**Approval record:** Created only after all conditions are satisfied  
**Frozen title:** Admin Dashboard  
**Page 062:** Users unblocked, not created

---

## 1. Revision Summary

Revision 1 strengthens the Admin Dashboard governance model without redesigning the page. The dashboard
remains a read-oriented operational oversight surface that summarizes, aggregates, filters, explains, and
routes authorized users to authoritative workflows.

This revision clarifies:

- dashboard purpose
- human authority boundaries
- source-of-truth boundaries
- data freshness
- widget governance
- KPI governance
- operational alerts
- navigation to authoritative workflows
- filtering and scope
- pending approvals
- system health presentation
- export boundaries
- privacy and fairness
- auditability
- AI boundaries
- accessibility
- international readiness
- Page 062 Users boundary

No approved pages are modified.

---

## 2. Dashboard Purpose

Page 061 is a read-oriented operational oversight surface.

It may:

- summarize operational status
- aggregate governed source records
- filter visible information within authorized scope
- explain KPI and alert meaning
- route users to authoritative workflows

It must not:

- execute operational workflows
- create authoritative state
- replace source records
- act as a hidden control plane

```text
Dashboard != Workflow
Visibility != Authority
Metric != Authoritative record
Alert != Decision
Widget action != Workflow execution
```

---

## 3. Human Authority and Access Scope

Represent distinct access scopes:

- platform administrator
- organization administrator
- operations manager
- residence manager
- department manager
- authorized support reviewer
- read-only auditor

Boundary rules:

```text
Dashboard access != Permission to act in every linked workflow
Organization visibility != Cross-organization visibility
Residence access != Unrestricted department access
Open workflow != Action authorized
```

Every linked action remains governed by the destination workflow and its own permission model.

---

## 4. Source-of-Truth Boundary

Page 061 may aggregate from:

- shifts
- assignments
- attendance
- worker availability
- qualifications
- conflict records
- replacement records
- support
- reports
- system health sources

It must not become authoritative for any of them.

Clarifications:

```text
Dashboard count != Source record count if data is stale
Dashboard alert cleared != Underlying issue resolved
Dashboard refresh != Source workflow changed
No alert displayed != No operational issue exists
Stale data != Current truth
```

---

## 5. Data Freshness

Every relevant dashboard area should show freshness state.

Represent:

- last refreshed timestamp
- source freshness
- stale data
- partial data
- unavailable source
- delayed aggregation
- refresh in progress
- refresh failed

Stale aggregates must never be presented as current truth.

---

## 6. Desktop Wireframe Revision

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Workforce OS / Admin Dashboard                                      │
│ Role: Administrator | Scope: Authorized org/residence/department             │
│ Last refreshed: [timestamp] | Source state: Current / Partial / Stale        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Governed Filters                                                             │
│ [Organization] [Residence] [Department] [Worker role] [Urgency] [Date range] │
│ [Shift status] [Operational state] [Timezone] [Source freshness]             │
│ Restricted filters are hidden or marked unavailable.                         │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ Operational Alerts   │ Active Operations    │ System Health                 │
│ Source + freshness   │ Source + freshness   │ Read-only summary             │
│ ┌──────────────────┐ │ ┌──────────────────┐ │ ┌───────────────────────────┐ │
│ │ Uncovered shift  │ │ │ Active shifts    │ │ │ Service available         │ │
│ │ Staffing shortage│ │ │ Open shifts      │ │ │ Degraded source           │ │
│ │ Overdue approval │ │ │ Workers on duty  │ │ │ Partial outage            │ │
│ │ Conflict queue   │ │ │ Urgent shifts    │ │ │ Maintenance state         │ │
│ └──────────────────┘ │ └──────────────────┘ │ └───────────────────────────┘ │
│ Acknowledge != fix   │ Counts != authority  │ Not incident console          │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Workflow Queues      │ KPI Snapshot         │ Administrative Context        │
│ ┌──────────────────┐ │ ┌──────────────────┐ │ ┌───────────────────────────┐ │
│ │ Manual assign    │ │ │ Fill rate        │ │ │ Access scope              │ │
│ │ Replacement reqs │ │ │ Staffing coverage│ │ │ Policy version            │ │
│ │ Pending approvals│ │ │ Approval time    │ │ │ Export request status     │ │
│ │ Attendance except│ │ │ SLA compliance   │ │ │ Audit availability        │ │
│ └──────────────────┘ │ └──────────────────┘ │ └───────────────────────────┘ │
│ Navigate only        │ Definitions visible  │ Export requires purpose       │
├──────────────────────┴──────────────────────┴───────────────────────────────┤
│ Authoritative Workflow Navigation                                            │
│ [Assigned Worker -> Page 046] [Approve Timesheet -> Page 049]                │
│ [Reports -> Page 052] [Support -> Page 055]                                  │
│ [Manual Assignment -> Page 058] [Conflict Resolution -> Page 059]            │
│ [Replacement Engine -> Page 060]                                             │
│                                                                              │
│ Navigation != State change. Dashboard does not execute workflow actions.     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Mobile Wireframe Revision

```text
┌──────────────────────────────┐
│ Admin Dashboard              │
│ Scope: Authorized view       │
│ Freshness: Current / Stale   │
├──────────────────────────────┤
│ High-Impact Alerts           │
│ Uncovered shift              │
│ Staffing shortage            │
│ Service degraded             │
│ Acknowledge != resolved      │
├──────────────────────────────┤
│ Urgent Operations            │
│ Active shifts                │
│ Workers on duty              │
│ Pending approvals            │
├──────────────────────────────┤
│ Queues                       │
│ Manual assignment            │
│ Replacement requests         │
│ Conflict queue               │
│ Attendance exceptions        │
├──────────────────────────────┤
│ KPI Snapshot                 │
│ [View definition]            │
│ [Freshness + source]         │
├──────────────────────────────┤
│ Navigate                     │
│ [Manual Assignment]          │
│ [Conflict Resolution]        │
│ [Replacement Engine]         │
│ [Reports] [Support]          │
└──────────────────────────────┘
```

Mobile prioritizes high-impact alerts, urgent staffing gaps, pending approvals, active shifts, replacement
and conflict queues, source freshness, compact filters, clear navigation, and large touch targets.

---

## 8. Widget Governance

Represent configurable widgets:

- active shifts
- open shifts
- urgent shifts
- workers on duty
- pending manual assignments
- replacement queue
- conflict queue
- attendance exceptions
- pending approvals
- staffing shortages
- qualification warnings
- support queue
- system health

Each widget defines:

- purpose
- source
- scope
- refresh state
- empty state
- navigation target
- authorization requirements

Widget availability must not be hardcoded globally.

---

## 9. KPI Governance

Represent configurable KPIs:

- shift fill rate
- staffing coverage
- replacement rate
- conflict volume
- approval time
- attendance compliance
- worker utilization
- SLA compliance

Every KPI conceptually preserves:

- definition
- numerator
- denominator
- time range
- exclusions
- source
- policy version
- last calculated time

Clarifications:

```text
KPI change != Performance finding
Low KPI != Worker fault
Undefined formula != Acceptable metric
Silently changed formula != Governed KPI
```

---

## 10. Operational Alerts

Represent alerts:

- uncovered shift
- staffing shortage
- overdue approval
- replacement required
- unresolved conflict
- expired qualification
- unavailable worker
- stale operational data
- policy warning
- service degradation

Alert states are independent:

- detected
- acknowledged
- routed
- source resolved
- stale
- dismissed from view
- unavailable

Clarifications:

```text
Acknowledged != Resolved
Dismissed != Underlying issue corrected
Alert != Automatic action
```

---

## 11. Navigation Boundary

The dashboard may route to:

| Dashboard route | Authoritative workflow |
| --- | --- |
| Assigned Worker | Page 046 |
| Approve Timesheet | Page 049 |
| Reports | Page 052 |
| Support | Page 055 |
| Manual Assignment | Page 058 |
| Conflict Resolution | Page 059 |
| Replacement Engine | Page 060 |
| Users | Page 062, not created here |

The dashboard must not execute those workflows.

```text
Open workflow != Action authorized
Navigation != State change
```

---

## 12. Filtering and Scope

Represent governed filters by:

- organization
- residence
- department
- worker role
- urgency
- shift status
- operational state
- date range
- timezone
- source freshness

Represent:

- active filter
- unavailable filter
- restricted filter
- no matching results
- partially authorized results

Filters must not reveal restricted records.

---

## 13. Pending Approvals

Page 061 may show counts and summaries for governed approvals.

It must not directly approve:

- assignments
- replacements
- qualifications
- timesheets
- payments
- invoices
- policy exceptions

```text
Pending approval displayed != Approval permitted from dashboard
```

---

## 14. System Health

Represent read-only system health:

- service available
- degraded
- unavailable
- delayed
- source unknown
- partial outage
- maintenance state

Do not expose:

- credentials
- secrets
- internal infrastructure details
- sensitive logs
- exploitable diagnostic information

```text
System health summary != Engineering incident console
```

---

## 15. Export Boundary

If exports are represented, include:

- authorization check
- purpose
- scope
- minimum necessary fields
- generated timestamp
- expiry
- audit event
- restricted-data exclusion

Do not include broad unrestricted exports.

```text
Dashboard visibility != Export permission
Export generated != Data may be retained indefinitely
```

---

## 16. Privacy and Fairness

Display only minimum necessary operational information.

Do not expose:

- banking information
- tax information
- health information
- identity-document images
- private addresses
- unrelated complaints
- investigation records
- internal fraud signals
- protected personal information
- private message bodies

Use role-appropriate summaries.

Fairness clarifications:

```text
High conflict count != Worker misconduct
Low utilization != Poor performance
Attendance exception != Fault established
Operational summary != Disciplinary conclusion
```

Operational summaries remain neutral and source-based.

---

## 17. Auditability

Conceptually preserve:

- dashboard opened
- scope selected
- filters applied
- widget viewed
- sensitive detail opened
- workflow navigation initiated
- export requested
- export generated
- access denied

Audit context includes:

- actor
- role
- timestamp
- organization
- residence or department scope
- dashboard context
- filter context
- export purpose where applicable

Do not broadly log protected displayed content.

---

## 18. AI Boundary

AI may:

- summarize visible operational status
- explain governed KPI definitions
- identify inconsistent aggregates
- identify missing or stale information
- draft an operational summary
- suggest navigation

AI must never:

- assign workers
- approve anything
- resolve conflicts
- initiate replacements
- change workflow state
- create alerts as authoritative facts
- determine misconduct
- rank workers using protected information
- expose restricted data
- write authoritative records

---

## 19. Empty and Error States

Include:

- no active operations
- no matching results
- no alerts
- source unavailable
- partial data
- stale data
- refresh failed
- access denied
- widget unavailable
- system degraded
- service unavailable

Do not fabricate healthy status or current data.

---

## 20. Accessibility

Review:

- semantic landmarks
- keyboard navigation
- screen-reader-friendly widgets
- accessible tables
- accessible chart alternatives
- no color-only status indicators
- readable timestamps and timezones
- focus management
- sufficient contrast
- plain-language alerts
- accessible empty and stale states

---

## 21. International Readiness

Do not hardcode:

- dashboard layout
- widget set
- KPI formulas
- organization hierarchy
- residence structure
- role names
- labor rules
- SLA rules
- date format
- timezone
- locale
- language
- number format
- operational terminology

Keep jurisdiction, organization, dashboard policy, KPI policy, role policy, locale, timezone, and export
policy configurable.

---

## 22. Page 062 Boundary

Page 061 owns operational dashboard and monitoring.

Page 062 owns governed user administration.

Page 061 must not directly:

- create users
- invite users
- activate or deactivate users
- modify roles
- reset credentials
- alter permissions
- suspend accounts

Page 061 must not become a user-management page.

---

## 23. Validation

Confirmed:

- Governance control stack unchanged.
- Pages 001-060 unchanged.
- Page 061 remains Admin Dashboard.
- Page 062 remains Users.
- No Page 062 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No dashboard implementation created.
- No analytics engine created.
- No export implementation created.
- No user-management implementation created.
- No AI automation created.
- No commit, push, merge, or deployment performed.
- Unrelated app changes remain untouched.

---

## 24. Final Status

```text
Page 061 — Admin Dashboard
APPROVED WIREFRAME v1.0

Page 062 — Users
UNBLOCKED
NOT CREATED
```
