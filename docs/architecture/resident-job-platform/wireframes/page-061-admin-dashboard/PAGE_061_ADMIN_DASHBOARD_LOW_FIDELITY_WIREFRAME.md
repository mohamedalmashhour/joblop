# Resident Job

## Page 061 - Admin Dashboard Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner review:** Required  
**Approval record:** Not created  
**Implementation:** Not Started  
**Frozen title:** Admin Dashboard  
**Page 062:** Users blocked

---

## 1. Purpose

Page 061 designs the operational Admin Dashboard for Resident Workforce OS. It is a governed command
center that gives administrators and super administrators read-oriented visibility into platform activity,
operational risk, workflow queues, and system health.

The dashboard is an orchestration and monitoring surface only. It must not become the authoritative owner
of operational workflows.

---

## 2. Core Boundary Statements

```text
Dashboard != Workflow
Visibility != Authority
Metrics != Source of truth
Alert != Decision
Alert != Automatic action
Widget action != Workflow execution
KPI != Hardcoded definition
Dashboard export != Authoritative report
```

---

## 3. Primary Responsibilities

Represent read-oriented operational oversight for:

- active shifts
- open shifts
- urgent shifts
- assigned workers
- workers currently on duty
- pending manual assignments
- replacement requests
- conflict queue
- attendance exceptions
- worker availability
- pending approvals
- staffing shortages
- operational KPIs
- SLA indicators
- operational alerts
- system health

---

## 4. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Workforce OS / Admin Dashboard                                      │
│ Role: Administrator | Org: All authorized | Source freshness: Current        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Filters                                                                      │
│ [Organization] [Residence] [Department] [Worker role] [Urgency] [Date range] │
│ [Shift state] [Operational state]                                            │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ Operational Alerts   │ Active Operations    │ System Health                 │
│ ┌──────────────────┐ │ ┌──────────────────┐ │ ┌───────────────────────────┐ │
│ │ Staffing shortage│ │ │ Active workers   │ │ │ Mailer / storage / jobs   │ │
│ │ Uncovered shift  │ │ │ Active shifts    │ │ │ Data freshness            │ │
│ │ Overdue approval │ │ │ Open shifts      │ │ │ Service degradation       │ │
│ │ Conflict queue   │ │ │ Urgent coverage  │ │ └───────────────────────────┘ │
│ └──────────────────┘ │ └──────────────────┘ │                               │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ Workflow Queues      │ KPI Snapshot         │ Administrative Context        │
│ ┌──────────────────┐ │ ┌──────────────────┐ │ ┌───────────────────────────┐ │
│ │ Pending manual   │ │ │ Shift fill rate  │ │ │ Access scope              │ │
│ │ Replacement reqs │ │ │ Staffing coverage│ │ │ Policy version            │ │
│ │ Conflicts        │ │ │ Replacement rate │ │ │ Audit availability        │ │
│ │ Attendance alerts│ │ │ SLA compliance   │ │ │ Export request status     │ │
│ └──────────────────┘ │ └──────────────────┘ │ └───────────────────────────┘ │
├──────────────────────┴──────────────────────┴───────────────────────────────┤
│ Navigation only                                                              │
│ [Assigned Worker -> Page 046] [Reports -> Page 052] [Support -> Page 055]    │
│ [Manual Assignment -> Page 058] [Conflict Resolution -> Page 059]            │
│ [Replacement Engine -> Page 060]                                             │
│                                                                              │
│ No direct assign / replace / resolve / approve / attendance / payroll action │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Admin Dashboard              │
│ Scope: selected organization │
├──────────────────────────────┤
│ Critical Alerts              │
│ Staffing shortage            │
│ Uncovered shift              │
│ Service degradation          │
├──────────────────────────────┤
│ Today                        │
│ Active workers               │
│ Active shifts                │
│ Open urgent shifts           │
├──────────────────────────────┤
│ Queues                       │
│ Pending assignments          │
│ Replacement requests         │
│ Conflicts                    │
│ Attendance exceptions        │
├──────────────────────────────┤
│ KPI Snapshot                 │
│ Fill rate / SLA / coverage   │
│ Definitions configurable     │
├──────────────────────────────┤
│ Navigate                     │
│ [Manual Assignment]          │
│ [Conflict Resolution]        │
│ [Replacement Engine]         │
│ [Reports] [Support]          │
└──────────────────────────────┘
```

---

## 6. Navigation Boundary

The dashboard may navigate to authoritative workflows only:

| Dashboard item | Authoritative workflow |
| --- | --- |
| Assigned Worker | Page 046 |
| Reports | Page 052 |
| Support | Page 055 |
| Manual Assignment | Page 058 |
| Conflict Resolution | Page 059 |
| Replacement Engine | Page 060 |
| Users | Page 062, not created here |

The dashboard must never execute those workflows directly.

---

## 7. Authority Boundary

Page 061 must never directly:

- assign workers
- replace workers
- resolve conflicts
- approve qualifications
- approve timesheets
- modify attendance
- modify payroll
- modify invoices
- send notifications
- modify authoritative workflow state

Every operational action routes to its authoritative workflow.

---

## 8. Dashboard Widgets

Represent configurable widgets including:

- Active Workers
- Active Shifts
- Open Shifts
- Urgent Coverage
- Pending Assignments
- Replacement Queue
- Conflict Queue
- Attendance Alerts
- Pending Approvals
- Staffing Coverage
- SLA Compliance
- Operational Alerts
- System Health

Widget composition, order, visibility, and definitions remain configurable by role, organization, and
policy.

---

## 9. Filtering

Represent governed filters by:

- organization
- residence
- department
- worker role
- urgency
- shift state
- operational state
- date range

Filters narrow visibility only. They do not grant authority or modify source records.

---

## 10. Operational Alerts

Represent:

- staffing shortage
- uncovered shift
- overdue approval
- replacement required
- unresolved conflict
- expired qualification
- unavailable worker
- stale operational data
- policy warning
- service degradation

Clarify:

```text
Alert != Decision
Alert != Automatic action
Alert opened != Workflow changed
```

---

## 11. KPI Governance

Represent configurable KPIs such as:

- shift fill rate
- staffing coverage
- replacement rate
- conflict volume
- average approval time
- attendance compliance
- SLA compliance
- worker utilization

Do not hardcode KPI definitions. Every KPI should expose:

- definition
- source records
- freshness
- filter scope
- permission scope
- whether the value is complete or partial

---

## 12. Source-of-Truth Boundary

The dashboard shows aggregated operational information only.

It must never become authoritative for:

- shifts
- assignments
- attendance
- workers
- payroll
- financial records
- qualifications
- support cases
- system configuration

---

## 13. AI Boundary

AI may:

- summarize operational status
- explain KPIs
- identify trends
- identify missing operational data
- draft operational summaries
- suggest navigation to the authoritative workflow

AI must never:

- assign workers
- approve replacements
- resolve conflicts
- modify authoritative data
- change workflow state
- initiate operational actions
- fabricate metrics
- hide uncertainty

---

## 14. Auditability

Represent:

- dashboard viewed
- filters applied
- report opened
- navigation initiated
- export requested
- access denied

Record:

- actor
- role
- timestamp
- organization
- dashboard context
- filter scope where applicable

Audit records should not include restricted underlying record details unless the user opens the
authoritative workflow with proper permission.

---

## 15. Privacy

Expose only minimum necessary operational information.

Do not expose:

- banking information
- tax information
- health information
- identity documents
- investigation material
- unrelated complaints
- protected personal information
- private message bodies
- internal fraud signals

---

## 16. Empty and Error States

Include:

- no operational alerts
- no active shifts
- no open shifts
- no pending approvals
- no dashboard widgets configured
- filtered view has no records
- partial data unavailable
- stale operational data
- access denied
- export unavailable
- service degradation

Do not fabricate operational success.

---

## 17. Accessibility

Review:

- keyboard navigation
- semantic regions
- screen-reader compatibility
- accessible tables
- accessible charts
- color-independent indicators
- focus management
- plain-language operational alerts
- readable timestamps and timezones
- mobile-friendly target sizes

---

## 18. International Readiness

Do not hardcode:

- dashboard layout
- KPIs
- organization hierarchy
- locale
- timezone
- language
- labor rules
- SLA rules
- staffing rules

Keep dashboard behavior configurable by policy.

---

## 19. Validation

Confirmed in this wireframe package:

- Governance control stack unchanged.
- Pages 001-060 unchanged.
- Page 061 title remains Admin Dashboard.
- Exact Page 062 title identified as Users.
- No Page 062 files created.
- No approval record created.
- No implementation.
- No React.
- No frontend.
- No backend.
- No APIs.
- No database changes.
- No dashboard implementation.
- No analytics engine.
- No AI automation.
- No commit, push, merge, or deployment.

---

## 20. Final Status

```text
Page 061 — Admin Dashboard
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 062 — Users
BLOCKED
```
