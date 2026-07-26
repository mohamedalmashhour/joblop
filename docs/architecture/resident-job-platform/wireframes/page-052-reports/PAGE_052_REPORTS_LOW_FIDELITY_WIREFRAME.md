# Resident Job

## Page 052 - Reports

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 053:** Ratings blocked

---

## 1. Purpose

Page 052 designs the authenticated employer Reports experience.

Page 052 owns governed reporting and read-only aggregation across approved platform records. It continues from the frozen Phase 05 financial workflow and prepares a governed handoff to the next frozen workflow:

```text
Page 053 — Ratings
```

Page 052 may allow authorized users to:

- view operational reports
- view staffing reports
- view attendance reports
- view timesheet reports
- view invoice reports
- view payment-status reports
- filter by governed dimensions
- export approved report views
- inspect report freshness and source references
- hand off to future analytics or executive-dashboard workflows

Page 052 must not:

- modify source records
- approve attendance
- approve timesheets
- issue invoices
- execute payments
- reconcile money
- create accounting entries
- calculate payroll
- file taxes
- infer misconduct
- expose restricted personal or financial data
- allow AI to fabricate metrics or conclusions

---

## 2. Primary Users

Authorized employer-side users with report visibility permissions:

- organization owner
- operations manager
- residence manager
- department manager
- finance manager
- billing administrator
- read-only auditor
- authorized support

Role, organization, residence, department, report category, and data sensitivity determine report visibility, filter access, export permission, and audit requirements.

---

## 3. Report Categories

Represent governed report categories such as:

- staffing
- shift coverage
- urgent shifts
- applications
- assignments
- attendance
- timesheets
- invoices
- payments
- cancellations
- operational exceptions
- compliance status where permitted
- audit summaries where permitted

Clarify:

```text
Report != Source record
Report total != Accounting balance
Report trend != Performance judgment
```

Reports are read-only views. They must not become operational control pages.

---

## 4. Source-of-Truth Boundary

Reports are read-only views derived from authoritative records.

Each report should identify its source domain where appropriate:

- shifts
- applicants
- assignments
- attendance
- timesheets
- invoices
- payments

Clarify:

```text
Displayed report value != Editable source data
Stale report != Current operational truth
Aggregated result != Final accounting statement
```

Page 052 must not rewrite, correct, approve, reconcile, or finalize upstream records.

---

## 5. Data Freshness

Every report should conceptually show:

- generated time
- data-through time
- freshness status
- source availability
- partial-data warning
- last refresh
- timezone

Possible states:

- current
- recent
- stale
- partial
- unavailable
- generation failed

Do not present stale or partial data as complete.

---

## 6. Filtering

Represent governed filters such as:

- organization
- residence
- department
- date range
- shift type
- worker role
- invoice status
- payment status
- operational status
- locale or timezone where relevant

Do not allow filtering by protected characteristics or restricted information.

Clarify:

```text
Filter != Ranking
Filter result != Recommendation
```

Filters narrow the visible report set. They do not judge workers, rank workers, or recommend staffing decisions.

---

## 7. Metrics and Definitions

Each metric should conceptually include:

- name
- definition
- numerator
- denominator where applicable
- reporting period
- source
- exclusions
- freshness
- rounding rule

Do not present ambiguous metrics without definitions.

Clarify:

```text
Coverage rate != Worker quality
Cancellation count != Worker misconduct
Payment pending != Payment failure
```

---

## 8. Operational Reports

Represent possible governed views for:

- shifts created
- shifts filled
- shifts unfilled
- urgent shifts
- assignments pending
- worker responses
- check-in status
- attendance exceptions
- timesheets awaiting approval

Do not let operational reports become shift creation, applicant review, attendance approval, timesheet approval, messaging, dispatch, or disciplinary action pages.

---

## 9. Financial Reports

Represent high-level governed views such as:

- invoices issued
- invoices outstanding
- invoices overdue
- payments initiated
- payments settled
- partial payments
- refunds
- disputes
- reconciliation pending

Clarify:

```text
Invoice total != Recognized revenue
Payment settled != Reconciled
Report total != Audited financial statement
```

Page 052 must not own accounting or tax reporting.

---

## 10. Worker Privacy

Use aggregation and minimum-necessary detail.

Do not expose:

- banking information
- tax identifiers
- health information
- private complaints
- investigation notes
- full identity documents
- private addresses
- unrelated employment history
- precise location history
- internal fraud signals

Small-group or individual reports must follow governed privacy thresholds.

---

## 11. Permissions

Represent role-based visibility for:

- organization owner
- operations manager
- residence manager
- department manager
- finance manager
- billing administrator
- read-only auditor
- authorized support

Clarify:

```text
Report visibility != Source-record modification authority
Financial-report visibility != Payment authority
Audit-summary visibility != Investigation authority
```

Permission states should distinguish:

- may view report
- may apply filters
- may export approved view
- may view source references
- may view sensitive report summary
- may not modify source records
- may not access restricted personal or financial data

---

## 12. Export Governance

Represent export states:

- export requested
- export generating
- export ready
- export expired
- export failed
- export unavailable

Possible formats may include:

- CSV
- spreadsheet
- PDF
- printable view

Do not implement export.

Exports must preserve:

- applied filters
- generation time
- data-through time
- source references
- confidentiality marking where required

Do not export restricted fields by default.

---

## 13. Auditability

Conceptually preserve:

- report viewed
- sensitive report opened
- filter applied
- export requested
- export generated
- export downloaded
- authorization denied

Include:

- actor
- role
- timestamp
- report reference
- organization or residence scope
- action
- purpose or case reference where required
- result

Do not broadly log raw report contents.

---

## 14. AI Boundary

AI may:

- summarize visible report data
- explain metric definitions
- identify stale or incomplete reports
- help build safe filters
- draft a management summary
- suggest navigation

AI must not:

- fabricate values
- alter report data
- infer misconduct
- rank workers
- make hiring decisions
- approve attendance or timesheets
- determine payment success
- produce unsupported financial conclusions
- expose restricted information

Every AI-generated summary must remain traceable to visible report data.

Clarify:

```text
AI summary != Verified conclusion
AI trend explanation != Worker ranking
AI management draft != Official financial report
```

---

## 15. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Header
│   ├── Reports
│   ├── Organization / residence context
│   ├── Reporting period
│   └── Freshness state
│
├── Report navigation
│   ├── Staffing
│   ├── Operations
│   ├── Attendance
│   ├── Timesheets
│   ├── Invoices
│   ├── Payments
│   └── Compliance / audit where permitted
│
├── Filter panel
│   ├── Organization
│   ├── Residence
│   ├── Department
│   ├── Date range
│   ├── Operational status
│   └── Financial status where permitted
│
├── Report body
│   ├── Summary metrics
│   ├── Definitions
│   ├── Data freshness
│   ├── Source references
│   ├── Table / chart area
│   └── Warnings for stale, partial, or unavailable data
│
├── Export and audit panel
│   ├── Export request
│   ├── Export status
│   ├── Confidentiality notice
│   └── Report access audit guidance
│
└── Footer actions
    ├── Open source record where authorized
    ├── Export approved view
    ├── View metric definitions
    ├── Contact support
    └── Continue to Ratings
```

### Mobile Structure

```text
Reports
├── Report title
├── Reporting period
├── Freshness / partial-data state
├── Key metrics
├── Filters
├── Source references
├── Definitions
├── Warnings
├── Export action
└── Ratings handoff
```

Mobile must prioritize:

```text
What report am I viewing?
What period does it cover?
Is the data fresh and complete?
What do the metrics mean?
Can I safely export this view?
```

Avoid dense executive dashboards on small screens.

---

## 16. Empty and Error States

Include:

- no report data
- no results for filters
- partial data
- stale report
- source unavailable
- report generation failed
- export failed
- access denied
- unsupported date range
- service unavailable

Do not fabricate totals.

---

## 17. Accessibility

Review:

- semantic report headings
- keyboard navigation
- accessible filters
- screen-reader-friendly metrics
- accessible tables
- no color-only trends
- readable charts with text alternatives
- clear freshness warnings
- focus management
- sufficient contrast
- plain-language definitions
- accessible export controls

---

## 18. International Readiness

Do not hardcode:

- currency
- date format
- time format
- timezone
- decimal format
- reporting period
- worker classification
- invoice terminology
- payment terminology
- privacy threshold
- retention rule
- report language
- export format

Keep jurisdiction, organization, residence, department, locale, timezone, currency, metric definitions, and reporting policy configurable.

---

## 19. Page 053 Boundary

Exact frozen Page 053 title:

```text
Page 053 — Ratings
```

Source:

- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`
- `docs/architecture/resident-job-platform/pages/PAGE_053_RATINGS.md`

Page 052 owns:

```text
Reports
```

Page 053 owns:

```text
Ratings
```

Page 052 may provide governed report context to future ratings workflows where authorized, but it must not rank workers, generate ratings, infer misconduct, or convert report trends into performance judgments.

---

## 20. Validation

Confirmed:

- Phase 05 assessment remains READY.
- Pages 001-051 remain unchanged.
- Exact Page 053 frozen title identified as Ratings.
- No Page 053 files created.
- No Page 052 approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No reporting engine created.
- No export implementation created.
- No analytics implementation created.
- No accounting implementation created.
- No payroll implementation created.
- No AI reporting automation created.

---

## 21. Final Status

```text
Page 052 — Reports
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 053 — Ratings
BLOCKED
```
