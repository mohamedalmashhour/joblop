# Resident Job

## Page 056 - Operations Dashboard Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_056_OPERATIONS_DASHBOARD_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 057:** AI Dispatch unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 056 as a governed read-only Operations Dashboard. The dashboard
aggregates already-approved workflow information, but it does not become the source of truth,
execute actions, approve workflows, trigger notifications, automate dispatch, or generate AI
commands.

This revision resolves the documented owner conditions for:

- dashboard source-of-truth boundaries
- aggregation truthfulness
- freshness and completeness
- KPI definitions
- operational alert governance
- role-based visibility
- navigation versus action separation
- privacy
- financial boundary
- support and communication boundary
- ratings boundary
- auditability
- AI boundaries
- separation from AI Dispatch
- readiness for Page 057 - AI Dispatch

No redesign or implementation is introduced.

---

## 2. Dashboard Source of Truth

The dashboard remains a read-only aggregation layer.

Every widget must conceptually identify:

- authoritative source workflow
- source reference
- generated time
- data-through time
- freshness state
- completeness state
- last refresh
- timezone

Clarify:

```text
Dashboard value != Authoritative record
Dashboard snapshot != Current source state
Dashboard alert != Workflow decision
Dashboard KPI != Operational approval
```

The dashboard must never silently modify source records.

---

## 3. Aggregation Truthfulness

Represent aggregation states independently:

- current
- recent
- stale
- partial
- unavailable
- generation failed
- source mismatch
- refresh pending

Clarify:

```text
Partial != Zero
Unavailable != No activity
Stale != Current
Source mismatch != Resolved
```

Unavailable values must not be replaced with fabricated totals.

---

## 4. KPI Governance

Every KPI must conceptually include:

- name
- definition
- numerator
- denominator where applicable
- reporting period
- source
- inclusion rules
- exclusion rules
- rounding rule
- freshness
- timezone

Clarify:

```text
Metric != Judgment
Trend != Cause
Workload != Performance quality
Cancellation count != Misconduct
```

Undefined KPIs must not be displayed.

---

## 5. Dashboard Sections

Represent governed summaries for:

- active shifts
- recurring shifts
- urgent shifts
- applicants awaiting review
- assignment states
- live-shift states
- attendance exceptions
- timesheets awaiting approval
- invoice states
- payment states
- report freshness
- rating states
- unread or failed-message states
- support-case states

Each section routes to its authoritative workflow and does not duplicate that workflow inside the
dashboard.

---

## 6. Operational Alerts

Represent informational alerts such as:

- urgent shift unfilled
- assignment response pending
- tracking unavailable
- attendance exception
- timesheet pending
- invoice overdue
- payment pending or failed
- report stale
- rating awaiting moderation
- message delivery failed
- support escalation pending

Clarify:

```text
Alert != Confirmed incident
Alert != Misconduct
Alert acknowledged != Underlying issue resolved
```

Alerts cannot execute workflow changes.

---

## 7. Navigation Versus Action

The dashboard may provide governed navigation to:

- shift creation
- applicants
- assigned worker
- live tracking
- attendance
- timesheet approval
- invoices
- payments
- reports
- ratings
- messages
- support

Clarify:

```text
Navigate != Approve
Navigate != Assign
Navigate != Modify
Navigate != Execute payment
```

Any high-impact action must occur in its authoritative workflow.

---

## 8. Role-Based Visibility

Represent distinct dashboard visibility for:

- organization owner
- operations manager
- residence manager
- department manager
- finance manager
- support manager
- read-only executive
- auditor

Clarify:

```text
Dashboard visibility != Source-record authority
Organization access != Access to every residence or department
Executive visibility != Operational control
Auditor access != Private-case participation
```

Every widget remains scoped to the user's authorized organization, residence, department, role, and
purpose.

---

## 9. Privacy

Use aggregation and minimum-necessary detail.

Do not expose:

- identity documents
- banking information
- tax identifiers
- health information
- complaint details
- investigation notes
- private message content
- support evidence
- precise location history
- full payment credentials
- unrelated employment history
- internal fraud signals

Small-group and individual-level widgets must follow governed privacy thresholds.

---

## 10. Financial Boundary

The dashboard may summarize:

- invoices issued
- invoices outstanding
- invoices overdue
- payments initiated
- payments failed
- payments settled
- refunds pending
- reconciliation pending

Clarify:

```text
Invoice total != Recognized revenue
Payment settled != Reconciled
Dashboard total != Accounting statement
```

Page 056 must not own accounting, payroll, taxation, reconciliation, or payment execution.

---

## 11. Support and Communication Boundary

The dashboard may summarize:

- unread conversations
- failed message delivery
- support cases by state
- support cases awaiting user response
- escalation status

It must not expose:

- private message bodies
- internal support notes
- complaint details
- investigation evidence
- restricted attachments

Clarify:

```text
Unread message != User ignored the issue
Support escalation != Allegation proven
```

---

## 12. Ratings Boundary

The dashboard may show governed rating aggregates or moderation queues where authorized.

It must not:

- create ratings
- edit ratings
- rank workers
- rank employers
- create hidden trust scores
- impose visibility penalties
- infer performance from ratings

Clarify:

```text
Rating aggregate != Employment recommendation
Low rating != Misconduct
```

---

## 13. Auditability

Conceptually preserve:

- dashboard viewed
- scope changed
- filter changed
- widget opened
- drill-down initiated
- sensitive widget viewed
- export requested where applicable
- authorization denied

Include:

- actor
- role
- timestamp
- dashboard reference
- widget reference
- organization or residence scope
- action
- result
- purpose where required

Do not broadly log widget contents.

---

## 14. AI Boundary

AI may:

- summarize visible dashboard state
- explain KPIs
- identify stale or partial data
- explain alerts
- suggest navigation
- draft a management summary
- highlight visible operational dependencies

AI must never:

- assign workers
- approve applicants
- alter shifts
- approve attendance
- approve timesheets
- issue invoices
- execute payments
- resolve support cases
- moderate ratings
- send messages
- fabricate KPIs
- infer misconduct
- create operational commands

Every AI summary remains traceable to visible dashboard data.

---

## 15. AI Dispatch Boundary

Page 056 owns:

```text
Operations Dashboard
```

Page 057 owns:

```text
AI Dispatch
```

The dashboard may display read-only dispatch-related status only where already governed.

Page 056 must not:

- recommend workers for dispatch
- assign workers
- reassign workers
- optimize routes
- prioritize workers
- contact workers
- trigger notifications
- make autonomous staffing decisions
- create dispatch commands

Clarify:

```text
Dashboard alert != Dispatch instruction
Suggested navigation != Worker recommendation
Operational summary != Automated assignment
```

Do not create Page 057 files.

---

## 16. Empty and Error States

Represent:

- no operational data
- no authorized scope
- partial data
- stale data
- source unavailable
- widget failed
- refresh pending
- permission denied
- unsupported date range
- dashboard unavailable

Do not fabricate totals or success states.

---

## 17. Mobile Design

Mobile priority order:

1. current scope
2. freshness
3. urgent alerts
4. active shifts
5. assignment summary
6. attendance exceptions
7. pending timesheets
8. support issues
9. financial summary
10. drill-down navigation
11. large touch targets
12. clear stale and partial states

Avoid dense command-center layouts.

---

## 18. Desktop Design

Desktop may use:

- dashboard scope controls
- freshness summary
- operational KPI cards
- urgent alerts
- staffing and shift sections
- attendance and timesheet sections
- financial summary
- communication and support summary
- rating summary
- drill-down navigation
- definitions and privacy guidance

Do not include inline workflow forms or approval controls.

---

## 19. Accessibility

Review:

- semantic dashboard headings
- keyboard navigation
- screen-reader-friendly widgets
- accessible tables
- accessible alerts
- no color-only state meaning
- readable timestamps and timezones
- chart text alternatives
- focus management
- sufficient contrast
- plain-language KPI definitions
- clear stale and partial warnings

---

## 20. International Readiness

Do not hardcode:

- currency
- date format
- time format
- timezone
- reporting period
- KPI definitions
- worker classification
- shift terminology
- financial terminology
- privacy threshold
- locale
- alert policy
- operational scope model

Keep jurisdiction, organization, residence, department, role, locale, timezone, currency, KPI
definitions, privacy policy, and dashboard configuration configurable.

---

## 21. Validation

Confirmed:

- Frozen title remains Operations Dashboard.
- Pages 001-055 remain unchanged.
- Page 057 remains AI Dispatch.
- No Page 057 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No dashboard engine created.
- No analytics implementation created.
- No workflow automation created.
- No dispatch implementation created.
- No notification implementation created.
- No AI operational automation created.
- Unrelated app changes remain untouched.

---

## 22. Final Status

```text
Page 056 — Operations Dashboard
Revision 1: COMPLETE
Approval eligibility: SATISFIED

Page 057 — AI Dispatch
UNBLOCKED AFTER APPROVAL
NOT CREATED
```
