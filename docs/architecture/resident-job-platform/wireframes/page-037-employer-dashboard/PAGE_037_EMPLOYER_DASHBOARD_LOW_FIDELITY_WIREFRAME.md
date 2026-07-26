# Page 037 - Employer Dashboard Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Residence Manager, Scheduler
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Frozen architecture source: pages/PAGE_037_EMPLOYER_DASHBOARD.md
Preceding baseline: Page 036 - Settings Approved Wireframe v1.0
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 036 | Settings | pages/PAGE_036_SETTINGS.md |
| 037 | Employer Dashboard | pages/PAGE_037_EMPLOYER_DASHBOARD.md |
| 038 | Company Profile | pages/PAGE_038_COMPANY_PROFILE.md |

Page 037 begins the Employer Portal. It must not inherit worker-portal assumptions or expose
worker-owned settings, private worker data, or worker financial records.

## 2. Page Purpose

The Employer Dashboard is the operational home for authenticated employer-side users. It provides
scan-friendly visibility into organization staffing activity, active risks, approval queues, open
needs, conversations, notifications, compliance reminders, billing summaries, support requests, and
organization health.

The dashboard must answer:

```text
What requires attention now?
What changed today?
What is at risk?
What requires approval?
What needs staffing?
What requires compliance action?
```

It is a control surface only.

The dashboard must not become the source of truth for:

- shifts;
- workers;
- payroll;
- messaging;
- ratings;
- notifications;
- documents;
- payments;
- compliance records;
- invoices;
- organization permissions.

## 3. Employer Portal Boundary

Page 037 is separate from:

| Not this page | Boundary |
| --- | --- |
| Worker Dashboard | Employers see staffing operations, not worker personal workspace. |
| Scheduler Console | Employers review and request; schedulers dispatch and resolve conflicts. |
| Admin Dashboard | Employers cannot administer platform-wide users, payments, or compliance. |
| Payroll | Billing summaries are high-level only; payroll is not employer-visible here. |
| Worker Settings | Employers cannot change worker security, privacy, payment, consent, or deletion settings. |

Required distinctions:

```text
Open shift
does not equal
Filled shift

Worker suggested
does not equal
Worker approved

Candidate reviewed
does not equal
Assignment confirmed

Urgent request
does not equal
Guaranteed coverage

Billing summary
does not equal
Final invoice
```

## 4. Dashboard Information Hierarchy

The first screen prioritizes operational attention over reporting.

### Primary

- urgent staffing needs;
- shifts at risk today;
- pending approvals;
- active incidents or support requests;
- workers currently checked in.

### Secondary

- today's shifts;
- open shifts;
- filled shifts;
- pending applications;
- active conversations;
- unread notifications;
- compliance reminders.

### Tertiary

- billing summary;
- organization health;
- residence and department summaries;
- recent activity;
- navigation shortcuts.

## 5. Desktop Wireframe

```text
HEADER
Resident Job | Employer Dashboard | Organization: [Selected organization]
Role: [Employer / Residence Manager / Scheduler] | Notifications | Support

GOVERNANCE NOTICE
Dashboard metrics are operational summaries.
They do not replace source workflows for shifts, approvals, billing, compliance, messaging,
notifications, documents, or payments.
AI suggestions are advisory. Authorized humans approve operational actions.

PRIMARY ATTENTION BAND
[Urgent staffing needs]
- Count/status placeholder
- Highest-risk need
- Action: Review urgent needs
- Status: Requested / In review / Candidate suggested / Awaiting acceptance / Confirmed

[Shifts at risk today]
- Late arrival placeholder
- Missing confirmation placeholder
- Qualification risk placeholder
- Action: Review risks

[Pending approvals]
- Applications
- Timesheets
- Document/compliance review
- Replacement requests
- Action: Open approval queue

[Workers checked in]
- Checked in now
- Expected soon
- Missing check-in
- Action: View attendance

OPERATIONAL WORKSPACE
LEFT COLUMN - Staffing
- Today's shifts
- Open shifts
- Filled shifts
- Upcoming shifts
- Urgent replacement requests

MIDDLE COLUMN - People and Review
- Pending applications
- Candidate suggestions
- Worker availability summary
- Compliance expirations
- Pending document reviews

RIGHT COLUMN - Communications and Finance
- Active conversations
- Unread messages
- Notifications requiring action
- High-level billing summary
- Open support requests

ORGANIZATION HEALTH
- Residence coverage summary
- Department coverage summary
- Compliance reminder summary
- Support status
- Recent audit activity

NAVIGATION SHORTCUTS
Residences | Departments | Create Shift | Urgent Shift | Applicants | Attendance | Invoices | Reports | Support

AI ASSISTANT PANEL
Label: AI operational summary
- Summarizes visible dashboard items
- Prioritizes review tasks
- Suggests navigation
- Shows evidence/source widgets
- Never approves, assigns, rejects, edits, bills, or modifies compliance
```

## 6. Mobile Wireframe

```text
TOP BAR
Employer Dashboard | Organization selector | Alerts

ATTENTION SUMMARY
What needs attention now?
[Urgent staffing]
[At-risk shifts]
[Pending approvals]
[Checked-in workers]

ACTION QUEUE
Applications
Timesheets
Replacement requests
Compliance reminders
Support requests

TODAY
Today's shifts
Open shifts
Filled shifts
Workers currently checked in

COMMUNICATIONS
Messages
Notifications
Support

SUMMARY
Billing summary
Organization health
Residence / department shortcuts

AI SUMMARY
Collapsed by default
Advisory only
```

Mobile behavior:

- show attention cards before reports;
- collapse secondary summaries;
- use plain-language states;
- keep destructive or approval actions behind detail screens;
- avoid dense tables;
- keep tap targets at least 44px;
- use non-color-only status indicators.

## 7. Widget Model

Widgets are conceptual and must not invent live values.

| Widget | Purpose | Source-of-truth boundary |
| --- | --- | --- |
| Urgent staffing needs | Shows requests requiring fast review | Urgent Shift / staffing workflow owns details |
| Today's shifts | Shows operating-day status | Shift workflow owns shift records |
| Open shifts | Shows unfilled needs | Create Shift / shift workflow owns records |
| Filled shifts | Shows confirmed assignments | Assignment workflow owns confirmation |
| Workers checked in | Shows attendance summary | Attendance workflow owns check-in/out evidence |
| Pending applications | Shows employer review tasks | Applicant workflow owns applications |
| Compliance expirations | Shows upcoming risk | Compliance/document workflows own records |
| Unread messages | Shows communication attention | Messages owns conversations |
| Notifications | Shows actionable alerts | Notifications owns delivery and preferences |
| Billing summary | Shows high-level billing status | Invoices/Billing owns financial records |
| Support requests | Shows open support items | Support workflow owns cases |
| Organization health | Shows summary status | Dashboard aggregates only |

## 8. Status Language

Allowed dashboard statuses:

- Needs attention;
- Requested;
- In review;
- Candidate suggested;
- Awaiting acceptance;
- Confirmed;
- At risk;
- Checked in;
- Missing check-in;
- Pending approval;
- Requires review;
- Action unavailable;
- Source unavailable.

Avoid statuses that imply unsupported guarantees:

- guaranteed;
- automatically assigned;
- payroll approved;
- worker approved by AI;
- coverage secured before confirmation;
- invoice final before review.

## 9. Organization Switching

Organization switching is future-ready and permission-gated.

Conceptual states:

- single organization;
- multiple organizations available;
- organization switch pending;
- organization unavailable;
- permission denied;
- organization archived or restricted.

Switching organization context changes visible residences, departments, shifts, invoices,
approvals, messages, and support cases. It must not expose cross-tenant data.

No organization-switching implementation is designed.

## 10. Role-Based Visibility

The dashboard must adapt by role and permission.

| Role | Typical visibility |
| --- | --- |
| Employer | Organization overview, billing summaries, staffing requests, approvals where authorized |
| Residence Manager | Residence staffing, active shifts, local approvals, local conversations |
| Scheduler | Staffing operations, open needs, attendance status, replacement requests |
| Finance viewer | Billing summaries and invoices where authorized |
| Compliance viewer | Compliance reminders and document-review status where authorized |
| Support viewer | Support cases where authorized |

Users must not see navigation entries or data they cannot access.

## 11. Pending Tasks and Approval Queue

The approval queue may summarize:

- applications awaiting review;
- selected candidates requiring confirmation;
- timesheets awaiting employer review;
- document or compliance items requiring attention;
- urgent replacement requests;
- billing or invoice questions;
- support cases awaiting employer response.

Required distinctions:

```text
Pending approval
does not equal
Approved

Employer review
does not equal
Platform compliance approval

Timesheet review
does not equal
Payroll

Invoice question
does not equal
Payment dispute resolved
```

## 12. Privacy and Worker Data

Employer-visible worker information must remain minimum necessary for staffing operations.

Allowed dashboard-level worker visibility may include:

- worker name or display name where assigned or candidate-visible;
- role or category;
- assignment status;
- check-in/check-out status where authorized;
- compliance status summary relevant to the role;
- contact through governed messaging;
- application status.

Do not expose:

- worker private settings;
- worker private notes;
- worker banking or payment destinations;
- worker tax documents;
- raw background-check details;
- identity document images;
- unrestricted profile data;
- internal safety, fraud, or risk scores;
- worker deletion, export, or consent requests.

## 13. Billing Summary Boundary

Billing summary is high-level only.

It may show conceptual statuses such as:

- pending invoice review;
- invoice ready;
- payment method attention required;
- billing question open;
- estimated charges pending final review.

Required distinctions:

```text
Billing summary
does not equal
Final invoice

Estimate
does not equal
Final charge

Worker compensation
does not equal
Employer billing
```

Do not expose worker compensation, payroll status, internal commission, payment credentials, or
financial formulas.

## 14. Compliance Reminders

Compliance reminders may surface:

- upcoming licence expirations;
- document-review tasks;
- staffing requirement gaps;
- role suitability alerts;
- expired or pending compliance status.

Required distinctions:

```text
Compliance reminder
does not equal
Worker disqualification

Requirement gap
does not equal
Final rejection

AI compliance suggestion
does not equal
Compliance approval
```

Detailed compliance and document workflows remain authoritative.

## 15. AI Boundary

AI may:

- summarize operational status;
- explain dashboard widgets;
- prioritize visible tasks;
- suggest navigation;
- highlight missing information;
- identify staffing risks using visible evidence.

AI must never:

- approve workers;
- approve payroll;
- assign shifts automatically;
- reject applications;
- alter staffing;
- modify compliance;
- fabricate operational metrics;
- send messages;
- approve timesheets;
- create invoices;
- expose restricted worker data.

AI outputs must be labeled as recommendations and cite visible dashboard evidence.

## 16. Empty, Loading, and Error States

Empty states:

- no urgent needs;
- no shifts today;
- no open shifts;
- no pending approvals;
- no unread messages;
- no billing items requiring attention;
- no compliance reminders;
- no support requests.

Loading states:

- dashboard summary loading;
- organization context loading;
- widget unavailable;
- partial data loading.

Error states:

- source unavailable;
- permission denied;
- organization unavailable;
- stale summary;
- billing source unavailable;
- attendance source unavailable;
- messages unavailable;
- support unavailable.

The page must never fabricate values to make the dashboard appear populated.

## 17. Accessibility

The dashboard must support:

- semantic headings;
- keyboard navigation;
- screen-reader-friendly status labels;
- plain-language action labels;
- non-color-only urgency indicators;
- logical focus order;
- accessible organization switcher;
- accessible approval links;
- readable mobile cards;
- sufficient contrast;
- reduced-motion compatibility;
- clear error recovery paths.

## 18. International Readiness

The page must not hardcode:

- country-specific staffing rules;
- jurisdiction-specific compliance names;
- currency assumptions;
- date/time format;
- residence terminology;
- role labels that cannot be localized;
- legal deadlines;
- tax language;
- emergency numbers;
- worker classification rules.

Organization, residence, department, role, billing, compliance, localization, and permission rules
remain configurable.

## 19. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Employer Dashboard | Pass |
| Pages 001-036 unchanged | Pass |
| Architecture Freeze unchanged | Pass |
| Worker Portal assumptions not inherited | Pass |
| No Page 038 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No commit, push, merge, or deployment | Pass |

## 20. Final Wireframe Status

```text
Page 037 - Employer Dashboard
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 038 - Company Profile
BLOCKED
```
