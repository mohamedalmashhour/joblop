# Resident Job

## Page 056 - Operations Dashboard Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 057:** AI Dispatch blocked

---

## 1. Purpose

Page 056 designs the authenticated Operations Dashboard.

The Operations Dashboard is a governed read-only operational overview. It aggregates information
from already approved workflows and routes users to authoritative pages for action. It must never
become a source of truth, workflow automation, staffing engine, analytics engine, command center,
or operational execution surface.

The dashboard may summarize:

- active shifts
- recurring shifts
- urgent shifts
- applicants awaiting review
- assigned workers
- live shift status
- attendance status
- pending timesheets
- invoice summary
- payment summary
- support-case summary
- rating summary
- operational alerts
- workload indicators
- queue summaries
- governed KPIs

The dashboard must not:

- approve shifts
- assign workers
- approve attendance
- approve timesheets
- issue invoices
- execute payments
- resolve support cases
- create ratings
- modify workflows
- automate dispatch
- fabricate KPIs
- replace authoritative workflow pages

---

## 2. Architecture Reference

| Page | Frozen title | Source |
| --- | --- | --- |
| 056 | Operations Dashboard | `pages/PAGE_056_OPERATIONS_DASHBOARD.md` |
| 057 | AI Dispatch | `pages/PAGE_057_AI_DISPATCH.md` |

Page 056 is the first Scheduler Console page. This wireframe preserves the frozen title while
limiting the initial dashboard design to read-only aggregation and navigation. No Page 057 files
are created by this gate.

---

## 3. Source-of-Truth Boundary

Every dashboard card must identify:

- authoritative workflow
- source page
- data freshness
- last refresh
- reporting period or snapshot scope where applicable
- navigation target

Clarify:

```text
Dashboard value != Authoritative record
Dashboard KPI != Operational approval
Dashboard alert != Workflow execution
Dashboard snapshot != Live command state
```

If source data is stale, unavailable, partial, estimated, or delayed, the widget must say so
visibly.

---

## 4. Dashboard Information Hierarchy

Primary view:

1. operational alerts requiring attention
2. active shift snapshot
3. urgent shift coverage status
4. attendance exceptions
5. pending timesheets
6. support escalations

Secondary view:

1. applicant queues
2. assigned worker summary
3. recurring shift summary
4. invoice and payment summaries
5. rating moderation or trust signals
6. workload indicators

Tertiary view:

1. governed KPI cards
2. trend summaries
3. filter controls
4. export request placeholder where future policy permits
5. audit guidance

The first screen should answer:

```text
What needs attention?
What changed recently?
Which workflow owns the next action?
Is the data current enough to trust?
```

---

## 5. Operational Widgets

Allowed widget examples:

| Widget | Purpose | Authoritative source |
| --- | --- | --- |
| Active shifts | Show current operational volume | Live Shift Tracking / Attendance |
| Urgent shifts | Show unfilled or at-risk urgent needs | Urgent Shift |
| Applicants awaiting review | Show review queue count | Applicants |
| Assigned workers | Show active assignment coverage | Assigned Worker |
| Attendance status | Show exceptions and current status | Attendance |
| Pending timesheets | Show timesheets awaiting action | Approve Timesheet |
| Invoice summary | Show invoice queue status | Invoices |
| Payment summary | Show payment status groups | Payments |
| Support-case summary | Show support cases by status | Support |
| Rating summary | Show governed ratings signals | Ratings |
| Reports freshness | Show report staleness or readiness | Reports |

No widget may execute the underlying action.

---

## 6. Navigation Boundary

The dashboard may navigate to:

- Create Shift
- Applicants
- Assigned Worker
- Attendance
- Timesheets
- Invoices
- Payments
- Reports
- Ratings
- Messages
- Support
- future AI Dispatch

Clarify:

```text
Navigate != Approve
Navigate != Modify
Navigate != Assign
Navigate != Resolve
```

Buttons should use labels such as:

- View in authoritative workflow
- Open queue
- Review source record
- Go to page

Avoid labels that imply direct action, such as:

- Approve now
- Assign now
- Pay now
- Resolve now
- Dispatch automatically

---

## 7. Operational Alerts

Represent governed alerts only:

- urgent shift unfilled
- attendance exception
- pending timesheet
- overdue invoice
- payment pending
- support escalation
- rating awaiting moderation
- stale report
- data freshness warning
- authorization limitation

Alerts remain informational.

Clarify:

```text
Alert != Workflow execution
Alert severity != Misconduct finding
Alert count != Performance judgment
Alert shown != User authorized to act
```

Every alert routes to the authoritative workflow where action may occur if the user has permission.

---

## 8. KPI Governance

Every KPI must include:

- title
- definition
- reporting period
- source
- freshness
- calculation scope
- exclusions or limitations where needed

Clarify:

```text
Trend != Prediction
Metric != Judgment
High workload != Poor performance
KPI variance != Disciplinary evidence
```

KPI labels must avoid unsupported claims and must not rank staff, employers, workers, or teams
without a separate approved governance model.

---

## 9. Role-Based Visibility

Represent dashboard variations for:

- organization owner
- operations manager
- residence manager
- department manager
- finance manager
- support manager
- read-only executive
- auditor

Role-based visibility rules:

- users see only data within authorized organization, residence, department, role, and workflow scope
- finance summaries appear only to finance-authorized roles
- support case detail is limited to support-authorized roles
- worker personal details remain minimized
- audit access is read-only and purpose-bound

Clarify:

```text
Can view dashboard != Can view every widget
Can view widget != Can open every source record
Can view source record != Can modify it
```

---

## 10. Privacy

Display only minimum necessary information.

No dashboard card may expose:

- identity documents
- banking data
- tax identifiers
- health information
- complaint details
- investigation notes
- private conversations
- full payment credentials
- unrelated personal information
- precise location history beyond approved operational status
- resident or patient information

Use aggregate counts, status groups, and safe labels unless the user opens an authorized source
workflow.

---

## 11. Auditability

Conceptually preserve:

- dashboard viewed
- filter changed
- widget opened
- drill-down initiated
- export requested where applicable
- alert opened
- source navigation initiated

Include:

- actor
- role
- timestamp
- widget reference
- filter state where relevant
- action
- source page target

Do not broadly log sensitive widget payloads or private source-record data.

---

## 12. AI Boundary

AI may:

- summarize dashboard state
- explain KPIs
- explain alerts
- suggest navigation
- summarize visible operational trends
- identify stale or missing context

AI must never:

- assign workers
- approve attendance
- approve timesheets
- issue invoices
- execute payments
- resolve support cases
- create ratings
- modify workflows
- fabricate KPIs
- generate operational commands
- infer misconduct
- rank workers or staff without approved governance

AI summaries must be visibly labelled as advisory and based only on visible authorized data.

---

## 13. Empty, Loading, Error, and Success States

Empty states:

- no active shifts
- no urgent shifts
- no pending applicants
- no attendance exceptions
- no pending timesheets
- no support escalations
- no visible finance summary for this role

Loading states:

- loading dashboard
- loading widget
- refreshing snapshot
- opening authoritative workflow

Error states:

- widget unavailable
- source unavailable
- stale data
- partial data
- permission denied
- refresh failed
- KPI definition unavailable

Success states:

- dashboard refreshed
- filter applied
- source workflow opened
- export request recorded where permitted

The dashboard must not fabricate live data or show stale data as current.

---

## 14. Mobile Design

Mobile priority order:

1. alert summary
2. data freshness notice
3. active shifts
4. urgent shifts
5. attendance exceptions
6. pending timesheets
7. support escalations
8. finance summaries where authorized
9. ratings/messages/support summaries
10. KPI cards
11. filters

Use compact cards and clear drill-down links. Avoid dense command-center controls on mobile.

---

## 15. Desktop Design

Desktop may use:

- alert banner
- widget grid
- role/scoping filter row
- source/freshness labels on each card
- queue summary cards
- trend panels
- drill-down links
- read-only audit guidance

Do not expose restricted information in persistent side panels.

---

## 16. Accessibility

Review:

- semantic dashboard headings
- keyboard navigation
- screen-reader-friendly widgets
- accessible KPI cards
- accessible tables
- no color-only alerts
- readable timestamps
- sufficient contrast
- clear stale/partial/unavailable data labels
- focus management when navigating to source workflows

---

## 17. International Readiness

Do not hardcode:

- date formats
- time formats
- currencies
- KPIs
- worker classifications
- reporting periods
- operational terminology
- locale
- timezone
- jurisdiction-specific staffing assumptions

Keep dashboard configuration fully configurable.

---

## 18. Page 057 Boundary

Page 056 owns:

```text
Operations Dashboard
```

Page 057 owns:

```text
AI Dispatch
```

Page 056 may show a future navigation link to AI Dispatch where permitted. It must not run AI
dispatch recommendations, complete assignments, execute staffing decisions, or become the AI
Dispatch workflow.

No Page 057 files are created.

---

## 19. Product Design Review Checklist

The Product Design Review must evaluate:

- source-of-truth integrity
- aggregation truthfulness
- KPI governance
- operational alerts
- navigation boundaries
- role-based visibility
- privacy
- auditability
- AI governance
- accessibility
- mobile usability
- international readiness
- consistency with Pages 041-055
- readiness for Page 057 - AI Dispatch

---

## 20. Validation

Confirmed:

- Pages 001-055 remain unchanged.
- Exact Page 057 title identified as AI Dispatch.
- No Page 057 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No dashboard implementation created.
- No analytics implementation created.
- No workflow automation created.
- No AI automation created.
- No commit, push, merge, or deployment performed.

---

## 21. Final Status

```text
Page 056 — Operations Dashboard
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 057 — AI Dispatch
BLOCKED
```
