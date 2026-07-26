# Page 024 - Shift Details Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Frozen architecture source: pages/PAGE_024_SHIFT_DETAILS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 023 | Search Shifts | pages/PAGE_023_SEARCH_SHIFTS.md |
| 024 | Shift Details | pages/PAGE_024_SHIFT_DETAILS.md |
| 025 | Apply | pages/PAGE_025_APPLY.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Shift Details is the authoritative worker-facing information page before a worker decides to apply
for a shift.

It allows the worker to:

- understand the complete shift;
- review requirements;
- understand compensation;
- review employer or residence information;
- understand travel expectations;
- review qualification requirements;
- understand cancellation expectations;
- begin an application.

This page must not:

- automatically apply;
- automatically assign;
- automatically accept;
- guarantee employment;
- guarantee eligibility;
- bypass required reviews or consent.

## 3. Required Concept Boundaries

```text
Viewing a shift
does not equal
Applying

Applying
does not equal
Being selected

Selected
does not equal
Assigned

Assigned
does not equal
Accepted

Accepted
does not equal
Worked

Worked
does not equal
Paid
```

Shift Details may prepare the worker to begin an application. It does not replace Page 025 - Apply.

## 4. Information Ownership

Page 024 owns full shift review before application.

It does not own:

- Search and filtering.
- Application submission.
- Assignment acceptance.
- Attendance.
- Timesheet approval.
- Payroll or final payment.
- Credential verification.
- Background-check review.
- Worker approval.
- Employer billing.

## 5. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Shift Details           Profile Help │
│ Worker: [Name]                       Source: Search Shifts          Alert │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DECISION BOUNDARY NOTICE                                                   │
│ Review the full shift before applying. Viewing this shift does not apply,  │
│ reserve, assign, accept, or guarantee selection.                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT SUMMARY                                                              │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Role                         │ Kitchen Cook                                │
│ Department                   │ Kitchen                                     │
│ Employer / residence         │ [Approved operational name]                 │
│ Residence type               │ [Type placeholder]                          │
│ Location                     │ [General area + approved address behavior]  │
│ Date                         │ [Date]                                      │
│ Start / end                  │ 16:00 - 22:00                               │
│ Timezone                     │ [Timezone shown]                            │
│ Duration                     │ 6 hours                                     │
│ Overnight                    │ No / Yes, if applicable                     │
│ Urgency                      │ Standard / urgent / same-day                │
│ Current shift state          │ Open to application                         │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION READINESS                                                      │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Viewing state                │ Worker can review details                   │
│ Application state            │ Not applied                                 │
│ Selection state              │ Not selected                                │
│ Assignment state             │ Not assigned                                │
│ Acceptance state             │ Not accepted                                │
│ Attendance state             │ Not worked                                  │
│ Payment state                │ Not payable                                 │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ This readiness panel explains the workflow. It is not an employment,       │
│ payroll, or universal eligibility decision.                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ REQUIREMENT REVIEW                                                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Role suitability             │ Matches worker role group / further review  │
│ Licence requirements         │ Required / not required / gap / unknown     │
│ Certification requirements   │ Required / not required / expired / unknown │
│ Background-check status      │ Status summary only; no sensitive details   │
│ Availability                 │ Available / partial / conflict / unknown    │
│ Worker approval              │ Relevant status only, not universal         │
│ Requirement decision         │ Eligible based on known requirements /      │
│                              │ requirement gap / review needed / unknown   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Requirement gaps are summarized safely. Sensitive details remain in the    │
│ owning worker page or authorized review workflow.                          │
│ [Review profile] [Review licence] [Review certification] [Availability]    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMPENSATION - WORKER-FACING ONLY                                          │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Hourly worker rate           │ [Known / estimated / unavailable]           │
│ Shift premium                │ [If approved and applicable]                │
│ Urgent-shift premium         │ [If approved and applicable]                │
│ Travel allowance             │ [If approved and applicable]                │
│ Transportation allowance     │ [If approved and applicable]                │
│ Expense reimbursement        │ [Policy-driven placeholder]                 │
│ Estimated gross              │ [Amount if calculable]                      │
│ Informational notes          │ [Timing, approval, or pending notes]        │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Displayed estimate ≠ guaranteed final pay. Employer billing rate ≠ worker  │
│ pay rate. Travel allowance ≠ hourly wages. Estimated gross ≠ net pay.      │
│ Employer billing and platform margin are not shown to workers.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER / RESIDENCE INFORMATION                                           │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Approved name                │ [Employer/residence name if permitted]      │
│ General location             │ [City/area or approved address level]       │
│ Residence type               │ [Senior residence / care setting / other]   │
│ Department                   │ Kitchen                                     │
│ Shift contact process        │ [How contact is handled after approved flow]│
│ Operational summary          │ [Approved non-confidential summary]         │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Do not expose private resident information, confidential staffing data,    │
│ internal employer notes, sensitive facility details, or unverified ratings.│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TRAVEL EXPECTATIONS                                                        │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Distance / travel time        │ [Estimate / unavailable / worker-selected] │
│ Arrival expectation           │ [Approved arrival guidance]                │
│ Parking / entrance guidance   │ [Shown only if approved]                   │
│ Transit / transportation note │ [If available and non-sensitive]           │
│ Location precision            │ [Exact address timing depends on policy]   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Travel information may be estimated. It does not guarantee route time,     │
│ reimbursement, assignment, or arrival approval.                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT POLICIES AND EXPECTATIONS                                            │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Cancellation expectation      │ [Policy placeholder; no hardcoded fee]      │
│ Change indicator              │ [None / changed / review changes]          │
│ Dress / equipment             │ [Approved operational note]                │
│ Meal / break note             │ [If approved and applicable]               │
│ Safety or workplace note      │ [Approved non-sensitive note]              │
│ Support path                  │ [Contact support / active-shift support]   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Policies are operational summaries, not legal advice or employment         │
│ guarantees. Detailed terms remain governed by approved policy documents.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI EXPLANATION PANEL                                                       │
│ AI may summarize shift information, explain requirement gaps, explain      │
│ compensation, and explain travel expectations.                             │
│ AI does not decide eligibility, apply automatically, accept assignments,   │
│ negotiate compensation, or fabricate shift information.                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACTION AREA                                                                │
│ Primary safe action: [Begin application]                                   │
│ Secondary actions: [Save shift] [Back to search] [Contact support]         │
│ If important details or consent are required, Begin application leads to   │
│ Page 025 - Apply rather than applying automatically.                       │
└────────────────────────────────────────────────────────────────────────────┘
```

## 6. Mobile Wireframe

The mobile version must keep the decision-critical information above secondary detail.

```text
┌──────────────────────────────┐
│ Shift Details          Help  │
│ Kitchen Cook                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REVIEW BEFORE APPLYING       │
│ Viewing ≠ applying           │
│ Applying ≠ assigned          │
│ Accepted ≠ worked            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SHIFT SUMMARY                │
│ Today 16:00-22:00            │
│ Timezone: [Shown]            │
│ Department: Kitchen          │
│ Location: [General area]     │
│ Urgency: Same-day            │
│ State: Open to application   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ APPLICATION READINESS        │
│ Application: Not applied     │
│ Assignment: Not assigned     │
│ Requirement: review needed   │
│ [View requirement gaps]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ COMPENSATION                 │
│ Worker rate: [Known/est.]    │
│ Premium: [If approved]       │
│ Travel: [If approved]        │
│ Estimated gross: [Amount]    │
│ Estimate ≠ final pay         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REQUIREMENTS                 │
│ Licence: satisfied/needed    │
│ Certification: satisfied/gap │
│ Background: summary only     │
│ Availability: conflict/ok    │
│ [Review owning page]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EMPLOYER / RESIDENCE         │
│ [Approved operational info]  │
│ No confidential facility     │
│ notes shown                  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRAVEL AND POLICIES          │
│ Travel estimate              │
│ Arrival guidance             │
│ Cancellation expectation     │
│ Support path                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI EXPLANATION               │
│ Summary only. AI does not    │
│ decide or apply.             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ [Begin application]          │
│ [Save] [Back to search]      │
└──────────────────────────────┘
```

Mobile requirements:

- Primary action visible after decision-critical details.
- Compensation labels plain and screen-reader friendly.
- Requirement gaps short and actionable.
- No dense tables.
- No color-only state indicators.
- 44px minimum touch targets.
- Sticky action may be used only if it does not hide warnings or requirement gaps.

## 7. Requirement Review Rules

Summarize:

- Licence requirements.
- Certification requirements.
- Availability.
- Background-check status.
- Role suitability.

Requirement gaps must:

- be concise;
- explain the next action;
- avoid sensitive details;
- avoid legal conclusions;
- point to the owning worker page where appropriate.

Examples:

- Licence required for this shift.
- Certification expired.
- Availability conflict with this time.
- Background-check requirement status unavailable.
- Role suitability requires review.

## 8. Compensation Rules

Compensation must be worker-facing and truthful.

Separate where applicable:

- Hourly worker rate.
- Premiums.
- Travel allowance.
- Reimbursement.
- Estimated gross.
- Informational notes.

Do not expose:

- Employer billing.
- Platform margin.
- Internal pricing formulas.
- Guaranteed earnings unless explicitly approved by policy.

## 9. Employer Information Rules

Display only approved operational information.

Allowed:

- employer or residence name where permitted;
- general location;
- residence type;
- department;
- approved operational summary;
- shift contact process.

Not allowed:

- private resident information;
- confidential facility information;
- internal staffing notes;
- sensitive facility details;
- unverified ratings;
- fabricated demand or scarcity.

## 10. AI Boundaries

AI may:

- summarize shift information;
- explain requirement gaps;
- explain compensation;
- explain travel expectations.

AI must not:

- decide eligibility;
- apply automatically;
- accept assignments;
- negotiate compensation;
- fabricate shift information.

AI explanations must remain labeled as assistance, not decisions.

## 11. Empty, Loading, Error, and Changed States

| State | User-facing handling |
| --- | --- |
| Shift details loading | Show skeleton layout and avoid fake data. |
| Shift unavailable | Explain that the shift is no longer open and route back to search. |
| Shift filled | Show similar shift options without implying guaranteed availability. |
| Shift cancelled | Explain cancellation status and support path if the worker had acted. |
| Shift changed | Require the worker to review changed details before applying. |
| Compensation unavailable | Label unavailable and prevent unsupported estimates. |
| Requirement status unknown | Explain unknown status and route to support or owning page. |
| Permission restricted | Explain account-status limitation without exposing internal reasons. |
| Offline / stale | Show cached details as potentially stale; applying requires connectivity. |
| Application action failed | Explain retry/support path without duplicating Page 025. |

## 12. Accessibility

Review requirements:

- Mobile usability.
- Keyboard navigation.
- Screen-reader support.
- Plain language.
- Compensation clarity.
- Requirement clarity.
- Status clarity.
- No color-only indicators.
- Logical heading order.
- Focus moves to updated warnings or errors.
- Time, timezone, and duration are read clearly.
- Primary action labels are specific.

## 13. International Readiness

Do not hardcode:

- currency;
- date format;
- time format;
- week structure;
- distance units;
- compensation model;
- labour rules;
- cancellation fees;
- licence rules;
- certification rules;
- background-check rules;
- employer terminology.

Locale, jurisdiction, role, currency, language, timezone, and policy rules remain configurable.

## 14. Self Validation

| Requirement | Status |
| --- | --- |
| Frozen architecture unchanged | Pass |
| Pages 016-023 unchanged | Pass |
| No implementation started | Pass |
| No Page 025 created | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| No deployment | Pass |

## 15. Final Page Status

```text
Page 024 - Shift Details
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 025
BLOCKED
```
