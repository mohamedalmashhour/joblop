# Page 026 - Accepted Shift Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_026_ACCEPTED_SHIFT_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens accepted-shift governance, commitment lifecycle clarity,
material-change transparency, worker preparation, attendance boundaries, cancellation governance,
worker safety, privacy, AI boundaries, and mobile operational usability.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-025.
- EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Commitment Lifecycle

Page 026 owns only the accepted and confirmed commitment stage.

```text
Application Submitted
↓
Employer Review
↓
Selected
↓
Assignment Offered
↓
Worker Accepted
↓
Confirmed Commitment
↓
Arrival
↓
Check-in
↓
Working
↓
Check-out
↓
Attendance Review
↓
Payroll
```

Required boundaries:

```text
Accepted
does not equal
Arrived

Arrived
does not equal
Checked in

Checked in
does not equal
Worked

Worked
does not equal
Approved hours

Approved hours
does not equal
Paid
```

Accepted Shift is a preparation and commitment-management page. Attendance begins only in the
approved attendance flow.

## 3. Revised Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Accepted Shift          Profile Help │
│ Worker: [Name]                       Commitment status: Confirmed   Alert │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMMITMENT BOUNDARY NOTICE                                                 │
│ This page manages an accepted/confirmed commitment only. Accepted ≠        │
│ arrived. Arrived ≠ checked in. Checked in ≠ worked. Worked ≠ approved     │
│ hours. Approved hours ≠ paid.                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMMITMENT LIFECYCLE                                                       │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Prior completed stages       │ Application, review, selection, offer       │
│ Current stage                │ Worker accepted / confirmed commitment      │
│ Next operational stage       │ Arrival preparation                         │
│ Future attendance stage      │ Page 027 - GPS Check In                     │
│ Not created here             │ Check-in, hours edit, payroll, payment      │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ If confirmation is pending, show the pending state clearly and do not      │
│ allow it to appear as a final confirmed commitment.                        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ NOW - NEXT ACTION                                                          │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Current state                │ Confirmed commitment / pending confirmation │
│ Next required action         │ Review preparation checklist                │
│ Arrival target              │ [Arrival time / pending / changed]          │
│ Check-in readiness           │ Not open / blocked / ready for Page 027     │
│ Blocking issue               │ None / material change / account restriction│
│ Worker action required       │ Acknowledge changes / contact support       │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Check-in, check-out, hour edits, attendance approval, payroll, and final   │
│ payment cannot happen on this page.                                        │
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
│ Expected hours               │ [Expected duration]                         │
│ Overnight                    │ Yes / No                                    │
│ Commitment reference         │ [Reference placeholder]                     │
│ Last material update         │ [Timestamp placeholder]                     │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ MATERIAL CHANGE GOVERNANCE                                                 │
│ Worker must never unknowingly attend a materially changed shift.           │
├────────────────────┬────────────────────┬────────────────┬────────────────┤
│ Changed field      │ Previous value      │ New value      │ Effective time │
│ Date               │ [Previous]          │ [New]          │ [Time]         │
│ Time               │ [Previous]          │ [New]          │ [Time]         │
│ Location           │ [Previous]          │ [New]          │ [Time]         │
│ Employer/department│ [Previous]          │ [New]          │ [Time]         │
│ Duties             │ [Previous]          │ [New]          │ [Time]         │
│ Compensation       │ [Previous]          │ [New]          │ [Time]         │
│ Requirements       │ [Previous]          │ [New]          │ [Time]         │
│ Travel             │ [Previous]          │ [New]          │ [Time]         │
│ Cancellation terms │ [Previous]          │ [New]          │ [Time]         │
└────────────────────┴────────────────────┴────────────────┴────────────────┘
│ Acknowledgement status: not required / outstanding / acknowledged.         │
│ Worker action: acknowledge change, contact support, or follow the          │
│ governed inability-to-attend path. Outstanding acknowledgement remains     │
│ visible until addressed.                                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORKER PREPARATION CHECKLIST                                               │
│ These items support preparation. They are not completed automatically.      │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Review shift summary         │ Not started / reviewed                      │
│ Verify arrival time          │ Not started / reviewed                      │
│ Verify location              │ Not started / reviewed                      │
│ Verify travel plan           │ Not started / reviewed / unavailable        │
│ Verify required credentials  │ Satisfied / review needed / changed         │
│ Required attire              │ Not started / reviewed                      │
│ Required equipment           │ Not started / reviewed                      │
│ Workplace reminders          │ Not started / reviewed                      │
│ Emergency contacts           │ Available / unavailable / contact support   │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Checklist completion helps the worker prepare. It does not create arrival, │
│ check-in, attendance, approved hours, payroll, or payment.                 │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CHECK-IN READINESS                                                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Check-in window              │ Closed / not open yet / open in Page 027    │
│ Location requirement         │ Available / unavailable / review needed     │
│ Material changes             │ None / acknowledgement outstanding          │
│ Account status               │ Active / restricted / support required      │
│ Connectivity note            │ Online required / offline guidance shown    │
│ Next action                  │ Prepare / resolve blocker / use Page 027    │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ This page prepares for attendance only. It cannot create check-in,         │
│ check-out, edited hours, approved hours, or payroll.                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMPENSATION REVIEW                                                        │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Hourly worker rate           │ [Confirmed / estimated / pending]           │
│ Premiums                     │ [If approved and applicable]                │
│ Travel compensation          │ [If approved and applicable]                │
│ Reimbursements               │ [If approved and applicable]                │
│ Expected hours               │ [Expected duration]                         │
│ Estimated gross              │ [Estimated / confirmed / unavailable]       │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Expected hours ≠ approved hours. Approved hours ≠ payroll. Payroll ≠      │
│ payment completed. Employer billing and platform margin are not shown.     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DUTIES, SCOPE, AND WORKER SAFETY                                           │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Expected duties              │ [Approved operational summary]              │
│ Scope reminder               │ Work within approved role and qualifications│
│ Reporting unsafe situation   │ [Report issue] [Contact active support]     │
│ Emergency escalation         │ Use local emergency services where needed   │
│ Workplace reminder           │ [Approved non-clinical summary]             │
│ Qualification reminder       │ Do not perform work outside approved scope  │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ The page does not provide professional, regulated, clinical, or legal      │
│ instructions.                                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CANCELLATION / INABILITY TO ATTEND                                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Request cancellation         │ [Start governed request]                    │
│ Report emergency             │ [Report issue] + local emergency reminder   │
│ Contact support              │ [Contact support]                           │
│ Employer change/cancellation │ [What changed] [Worker action required]     │
│ Effect on commitment         │ Pending review / changed / cancelled        │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Request submitted ≠ cancellation approved. Reporting inability to attend  │
│ may trigger support, replacement, employer notification, or operational    │
│ review according to approved rules. It does not silently cancel a shift.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND VISIBILITY                                                     │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER SEES                │ EMPLOYER MAY SEE           │ PLATFORM ONLY    │
│ Accepted commitment        │ Relevant commitment status │ Audit trail      │
│ Operational details        │ Arrival/check-in state     │ Support notes    │
│ Worker compensation        │ Issue status when relevant │ Internal notes   │
│ Support paths              │ Approved attendance states │ Staffing notes   │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ Do not expose resident information, confidential employer notes, internal  │
│ operational comments, private staffing information, platform margin, or    │
│ employer billing to the worker.                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI ASSISTANCE                                                              │
│ AI may summarize the commitment, explain changes, explain compensation,    │
│ and explain preparation steps. AI must not cancel, accept changes, check   │
│ in, edit hours, negotiate pay, waive requirements, alter commitment terms, │
│ hide material changes, or fabricate shift information.                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACTION AREA                                                                │
│ [Review preparation] [Acknowledge material changes] [Contact support]      │
│ [Report inability to attend] [Get directions] [Open Page 027 when allowed]│
│ Page 027 remains the governed check-in page.                               │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4. Mobile Operational Flow

Mobile order must prioritize:

1. Commitment status.
2. Next action.
3. Arrival information.
4. Material-change acknowledgement.
5. Travel plan.
6. Preparation checklist.
7. Check-in readiness.
8. Compensation review.
9. Support and emergency path.
10. AI explanation.

The first screen must answer:

```text
What is my commitment?
What do I do next?
Is anything blocking me?
Has anything changed?
```

Secondary information may collapse behind progressive disclosure, but material changes,
acknowledgement requirements, safety, and check-in blockers must remain visible when active.

## 5. Resolved Owner Conditions

| Owner condition | Revision response |
| --- | --- |
| Commitment lifecycle | Full lifecycle added from application through payroll with explicit Page 026 ownership. |
| Material-change governance | Previous value, new value, effective time, acknowledgement, and support path added. |
| Worker preparation | Checklist added for shift review, arrival, location, travel, credentials, attire, equipment, reminders, and emergency contacts. |
| Compensation review | Hourly rate, premiums, travel compensation, reimbursements, expected hours, and estimated gross separated. |
| Attendance boundary | Check-in readiness section confirms this page cannot check in, check out, edit hours, approve hours, or submit payroll. |
| Cancellation boundary | Cancellation request and emergency/support paths added with request-submitted boundary. |
| Employer changes | Employer change/cancellation row displays what changed, worker action, support path, and effect on commitment. |
| Worker safety | Scope of work, unsafe situation reporting, emergency escalation, and qualification boundaries added. |
| Privacy | Worker, employer-visible, and platform-only boundaries clarified; confidential data exclusions stated. |
| AI boundary | AI is limited to explanation and cannot alter commitments or attendance/payroll states. |
| Mobile review | Mobile priority order updated around commitment, next action, arrival, travel, preparation, compensation, and support. |

## 6. State and Edge Cases

Required states:

- Worker accepted, confirmation pending.
- Confirmed commitment.
- Material change outstanding.
- Material change acknowledged.
- Check-in window not open.
- Check-in readiness blocked.
- Location unavailable.
- Travel estimate unavailable.
- Account restricted.
- Worker reports lateness.
- Worker reports inability to attend.
- Employer changes shift.
- Employer cancels shift.
- Support path unavailable.
- Offline or poor connectivity.

Every state must describe what happened and what the worker can do next.

## 7. Accessibility

Revision 1 maintains:

- mobile-first order;
- plain-language operational labels;
- keyboard-accessible acknowledgement and support actions;
- screen-reader-friendly status announcements;
- visible focus order from commitment status to next action;
- non-color-only material-change alerts;
- readable compensation and lifecycle distinctions.

## 8. International Readiness

The page does not hardcode:

- country-specific labor rules;
- payroll law;
- emergency numbers;
- clinical instructions;
- jurisdiction-specific cancellation penalties;
- tax or accounting advice.

Operational labels remain configurable and localization-ready.

## 9. Governance Confirmation

```text
Frozen title remains Accepted Shift.
Architecture Freeze unchanged.
Epic 3 Planning unchanged.
UX Foundation unchanged.
Navigation unchanged.
Pages 016-025 unchanged.
EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged.
No Page 027 created.
No implementation started.
No React/frontend/backend/API/database work.
No attendance implementation.
No payroll implementation.
No production data.
```

## 10. Final Revision Status

```text
Page 026 - Accepted Shift
Wireframe Revision 1: COMPLETE
Ready for Product Design Review Revision 1

Page 027
BLOCKED until Page 026 approval record is created
```
