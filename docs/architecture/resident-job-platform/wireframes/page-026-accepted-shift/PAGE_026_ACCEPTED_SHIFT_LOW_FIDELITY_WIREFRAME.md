# Page 026 - Accepted Shift Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Scheduler and Employer where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Frozen architecture source: pages/PAGE_026_ACCEPTED_SHIFT.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 025 | Apply | pages/PAGE_025_APPLY.md |
| 026 | Accepted Shift | pages/PAGE_026_ACCEPTED_SHIFT.md |
| 027 | GPS Check In | pages/PAGE_027_GPS_CHECK_IN.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Accepted Shift is the worker's operational preparation page after a shift has reached the accepted
or confirmed-assignment state according to the approved workflow.

It helps the worker:

- understand the accepted assignment;
- review date, time, location, and timezone;
- review role, duties, requirements, and workplace expectations;
- understand compensation summary;
- prepare for travel and arrival;
- see check-in readiness;
- access support;
- understand cancellation or issue-reporting paths;
- prepare for Page 027 - GPS Check In.

The page must not:

- perform check-in;
- perform check-out;
- confirm attendance;
- approve timesheets;
- create payroll;
- guarantee final payment;
- modify availability automatically;
- expose employer billing;
- expose platform margin.

## 3. Required Concept Boundaries

```text
Accepted shift
does not equal
Check-in

Check-in
does not equal
Worked shift

Worked shift
does not equal
Approved timesheet

Approved timesheet
does not equal
Payroll

Accepted shift
does not equal
Employment contract unless approved legal workflow says so
```

Accepted Shift is operational preparation and status. Attendance begins in Page 027.

## 4. Information Ownership

Page 026 owns:

- accepted shift summary;
- worker next-action guidance;
- arrival preparation;
- check-in readiness status;
- accepted-shift change alerts;
- support and issue paths;
- cancellation or inability-to-attend guidance;
- accepted-shift visibility boundaries.

Page 026 does not own:

- search;
- application submission;
- employer review;
- check-in event creation;
- check-out event creation;
- attendance approval;
- timesheet approval;
- payroll;
- employer billing;
- worker credential verification.

## 5. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Accepted Shift          Profile Help │
│ Worker: [Name]                       Assignment status: Accepted    Alert │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACCEPTED SHIFT BOUNDARY NOTICE                                             │
│ This shift is accepted/confirmed according to the approved workflow.       │
│ It is not check-in, attendance confirmation, timesheet approval, payroll,  │
│ or final payment.                                                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ NOW - NEXT ACTION                                                          │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Current state                │ Accepted shift                              │
│ Next required action         │ Prepare for check-in window                 │
│ Check-in window              │ Opens [time] / not open yet / open now      │
│ Check-in page                │ Page 027 - GPS Check In                     │
│ Blocking issue               │ None / requirement changed / support needed │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Check-in cannot be completed from this page unless a future approved       │
│ workflow explicitly authorizes that behavior.                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACCEPTED SHIFT SUMMARY                                                     │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Role                         │ [Role]                                      │
│ Department                   │ [Department]                                │
│ Employer / residence         │ [Approved operational name]                 │
│ Location                     │ [Approved post-acceptance visibility]       │
│ Date                         │ [Date]                                      │
│ Start / end                  │ [Start] - [End]                             │
│ Timezone                     │ [Timezone shown]                            │
│ Duration                     │ [Expected duration]                         │
│ Overnight                    │ Yes / No                                    │
│ Assignment identifier        │ [Reference placeholder]                     │
│ Last material update         │ [Timestamp placeholder]                     │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ MATERIAL CHANGE / REVIEW REQUIRED                                          │
│ Change status: none / changed / pending review                             │
│ Changed fields: [time] [location] [requirements] [compensation] [duties]   │
│ Worker action: acknowledge changes, contact support, or follow approved    │
│ cancellation / inability-to-attend path.                                   │
│ The platform must not silently change an accepted shift without a visible  │
│ worker-facing record.                                                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ REQUIREMENTS AND READINESS                                                 │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Licence requirement          │ Satisfied / changed / review needed         │
│ Certification requirement    │ Satisfied / changed / review needed         │
│ Background-check requirement │ Status summary only, no sensitive details   │
│ Availability                 │ Accepted commitment protected               │
│ Worker readiness             │ Ready / issue detected / review required    │
│ Support path                 │ [Contact support] [Report issue]            │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Requirement status supports preparation. It is not a new universal worker  │
│ approval or legal determination.                                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DUTIES AND WORKPLACE EXPECTATIONS                                          │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Expected duties              │ [Approved operational summary]              │
│ Scope reminder               │ Work only within approved role/training     │
│ Reporting process            │ [Approved arrival/reporting process]        │
│ Attire / equipment           │ [Approved summary]                          │
│ Safety / conduct note        │ [Approved policy summary]                   │
│ Confidentiality reminder     │ [Approved summary]                          │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ This page does not provide clinical instructions, regulated-work           │
│ authorization, or permission to work outside assignment scope.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TRAVEL AND ARRIVAL                                                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Address visibility           │ [Post-acceptance approved location detail]  │
│ Estimated travel time        │ [Estimate / unavailable]                    │
│ Arrival expectation          │ [Approved arrival guidance]                 │
│ Parking / transit            │ [Approved summary]                          │
│ Entrance / check-in process  │ [Approved non-sensitive instructions]       │
│ Distant-site warning         │ [If applicable]                             │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Travel estimate ≠ guaranteed arrival time. Worker should use judgment,     │
│ approved site instructions, and support path for uncertainty.              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMPENSATION SUMMARY                                                       │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Worker rate                  │ [Confirmed / estimated / pending]           │
│ Premiums                     │ [If approved and applicable]                │
│ Travel / allowance           │ [If approved and applicable]                │
│ Estimated hours              │ [Expected duration]                         │
│ Estimated gross              │ [Estimated / confirmed / unavailable]       │
│ Payment note                 │ [Approved timing/method summary if known]   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Accepted shift ≠ final pay. Final compensation depends on verified work,   │
│ timesheet review, approved adjustments, and future payment workflow.       │
│ Employer billing and platform margin are not shown to workers.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ISSUE, CANCELLATION, AND SUPPORT PATHS                                     │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ I may be late                │ [Report lateness]                           │
│ I cannot attend              │ [Start inability-to-attend workflow]        │
│ Shift information changed    │ [Review change] [Contact support]           │
│ Workplace issue              │ [Contact active-shift support]              │
│ Emergency                    │ Use local emergency services where needed   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Inability to attend or cancellation follows an approved workflow. This     │
│ page must not silently cancel an accepted assignment.                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND VISIBILITY                                                     │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE           │ PLATFORM ONLY    │
│ Private notes              │ Accepted assignment status │ Audit trail      │
│ Personal travel preference │ Arrival/readiness status   │ Support notes    │
│ Support draft              │ Required operational info  │ Internal flags   │
│ Viewed history             │ Issue status where relevant│                  │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ Employer visibility is limited to the relevant assignment.                 │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI ASSISTANCE                                                              │
│ AI may summarize accepted shift details, highlight preparation steps,      │
│ explain changes, explain travel or requirement reminders, and suggest      │
│ support paths. AI must not check the worker in, cancel the shift, modify   │
│ acceptance, approve attendance, approve timesheets, calculate final pay,   │
│ hide material changes, or fabricate shift information.                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACTION AREA                                                                │
│ [View check-in requirements] [Open Page 027 when available] [Get directions]│
│ [Report issue] [Contact support] [Back to My Shifts]                       │
│ Check-in action becomes available only through the approved Page 027 flow. │
└────────────────────────────────────────────────────────────────────────────┘
```

## 6. Mobile Wireframe

Mobile must answer "What do I need to do now?" first.

```text
┌──────────────────────────────┐
│ Accepted Shift         Help  │
│ Assignment: Accepted         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NEXT ACTION                  │
│ Check-in opens: [time]       │
│ Current state: Accepted      │
│ Not checked in yet           │
│ [View check-in requirements] │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SHIFT SUMMARY                │
│ Role / department            │
│ Date + time + timezone       │
│ Location after acceptance    │
│ Last update: [placeholder]   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CHANGE ALERT                 │
│ None / changed / review      │
│ required                     │
│ [Review change]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ READINESS                    │
│ Requirements: ready/review   │
│ Availability: protected      │
│ Support: available           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRAVEL + ARRIVAL             │
│ Address / area               │
│ Travel estimate              │
│ Arrival guidance             │
│ [Directions]                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ COMPENSATION SUMMARY         │
│ Rate/premiums if known       │
│ Est. gross if available      │
│ Accepted ≠ final pay         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ISSUE PATHS                  │
│ Late / cannot attend / issue │
│ [Report] [Support]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI HELP                      │
│ Can summarize and remind     │
│ Cannot check in or cancel    │
└──────────────────────────────┘
```

Mobile requirements:

- Next action appears first.
- Check-in status is visible but does not perform check-in.
- Material changes are visible before secondary details.
- Travel and arrival details are easy to find.
- Issue/support actions have 44px minimum touch targets.
- Compensation is labeled as informational until future timesheet/payment workflows.

## 7. Status and Edge States

| State | Handling |
| --- | --- |
| Accepted / confirmed | Show next action and check-in readiness. |
| Check-in not open | Explain when it opens and what the worker can prepare. |
| Check-in window open | Route to Page 027; do not complete check-in here. |
| Material change | Require review and show support path. |
| Requirement changed | Show safe summary and support path. |
| Location unavailable | Show approved message and support path. |
| Travel estimate unavailable | Label unavailable; do not invent estimate. |
| Worker may be late | Provide report-lateness path. |
| Worker cannot attend | Provide governed inability-to-attend path. |
| Shift cancelled by employer | Show status and support/payment policy path where applicable. |
| Offline state | Show saved accepted-shift details if available; check-in requires approved live/offline strategy. |
| Support unavailable | Show fallback support guidance without claiming immediate resolution. |

## 8. Accessibility

Accessibility requirements:

- Keyboard navigation.
- Screen-reader support for shift state and next action.
- No color-only warnings.
- Clear heading order.
- Plain-language status labels.
- Time and timezone read clearly.
- Material-change alert announced.
- Support and issue buttons have descriptive labels.
- Mobile touch targets at least 44px.
- Focus management when an issue or support path opens.

## 9. International Readiness

Do not hardcode:

- currency;
- pay model;
- date format;
- time format;
- timezone;
- distance units;
- labour rules;
- cancellation rules;
- emergency numbers;
- role names;
- workplace policy;
- transportation policy;
- language.

Jurisdiction, employer, role, currency, locale, assignment rules, and policy rules remain
configurable.

## 10. Self Validation

| Requirement | Status |
| --- | --- |
| Frozen architecture unchanged | Pass |
| Pages 016-025 unchanged | Pass |
| No implementation started | Pass |
| No Page 027 created | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| No commit/push/merge/deployment | Pass |

## 11. Final Page Status

```text
Page 026 - Accepted Shift
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 027
BLOCKED
```
