# Page 022 - Availability Calendar Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_022_AVAILABILITY_CALENDAR_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens availability governance, assignment protection, recurring
scheduling, conflict management, timezone behavior, worker privacy, and staffing readiness.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-021.

## 2. Independent State Model

The calendar must show independent concepts instead of one merged calendar badge.

```text
A. Worker Availability
   Available
   Partially available
   Unavailable

B. Worker Preference
   Preferred
   Neutral
   Avoid if possible

C. Assignment State
   Offered
   Pending response
   Accepted
   Declined
   Completed
   Cancelled

D. Protected Commitments
   Accepted assignment
   Approved leave
   Mandatory training
   Employer-approved absence
```

These states must never collapse into one generic "busy" or "available" label.

## 3. Core Boundary

```text
Availability
!=
Assignment

Assignment
!=
Attendance

Attendance
!=
Payroll

Operational readiness
!=
Guaranteed assignment

Changing availability
!=
Changing an accepted assignment
```

Availability supports staffing and matching. It is not dispatch, assignment confirmation,
attendance confirmation, overtime approval, payroll, or guaranteed work.

## 4. Desktop Wireframe Revision

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Availability Calendar   Help Profile  │
│ Worker: [Name]                   Editing timezone: America/Toronto        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ GOVERNANCE NOTICE                                                          │
│ Availability helps Resident Job understand when you may be able to work.   │
│ It does not assign shifts, confirm attendance, calculate payroll, or       │
│ cancel accepted assignments.                                               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ STAFFING READINESS SUMMARY                                                 │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ Available today    │ Available tomorrow │ Urgent availability│ Travel     │
│ Yes, after 14:00   │ 07:00-15:00        │ Interested         │ 20 km max  │
├────────────────────┼────────────────────┼────────────────────┼────────────┤
│ Recurring pattern  │ Minimum notice     │ Max daily hours    │ Conflicts  │
│ Weekdays           │ 4 hours preferred  │ Preference only    │ 1 warning  │
│ Operational readiness is not a guaranteed assignment.                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ VIEW CONTROLS                                                              │
│ [Day] [Week] [Month] [List]        [Add availability] [Block time]         │
│ Week view active. Mobile defaults to week agenda/list.                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WEEK CALENDAR - SEPARATE STATUS LAYERS                                     │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ Mon      │ Tue      │ Wed      │ Thu      │ Fri      │ Sat      │ Sun    │
│ Avail:   │ Avail:   │ Avail:   │ Assign:  │ Boundary:│ Pref:    │ Unknown│
│ 07-15    │ 07-15    │ partial  │ accepted │ unavail. │ preferred│ setup  │
│ Pref: day│ Pref: day│ Conflict │ 14-22    │ Reason   │ Role:    │ needed │
│ Commit:  │ Commit:  │ warning  │ Protected│ private  │ kitchen  │        │
│ none     │ none     │          │          │          │          │        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┘
│ Availability, preference, assignment, and commitment status display        │
│ independently and do not rely on color alone.                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ RECURRING SCHEDULE GOVERNANCE                                              │
│ Pattern: [Weekly / alternating weeks / rotating schedule / date range]     │
│ Days: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]                            │
│ Time: [Start] -> [End]                                                     │
│ Overnight: [22:00 -> 06:00 next day]                                       │
│ Holiday overrides: [Configured separately; no country rule hardcoded]      │
│ Temporary recurring exception: [Start date] -> [End date]                  │
│ Applies to: [One occurrence] [Future occurrences] [Entire series]          │
│ [Review impact] [Save pattern]                                             │
│ Every recurring modification must state its scope before save.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PROTECTED COMMITMENT PANEL                                                 │
│ Existing accepted assignment: Thu 14:00-22:00                              │
│ Commitment type: Accepted assignment                                       │
│ Protection: cannot be overwritten by availability edits                    │
│ To change this shift: use the assignment change/cancellation workflow.     │
│ [View assignment] [Open support]                                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CONFLICT MANAGEMENT                                                        │
│ Conflict: unavailable block overlaps accepted assignment                   │
│ Severity: High                                                             │
│ Explanation: Availability cannot modify accepted commitments.              │
│ Recommended action: keep assignment, edit availability block, or contact   │
│ support.                                                                   │
│ Safe paths: [Edit block] [Keep assignment] [Contact support]               │
│ Other conflict types: overlapping availability, overlapping assignments,    │
│ leave conflicts, training conflicts, timezone conflicts, overnight          │
│ conflicts, duplicate recurrence, stale edits from another device.          │
│ Conflict detection never automatically overwrites data.                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TIMEZONE SAFETY                                                            │
│ Editing timezone: [Worker timezone]                                        │
│ Employer timezone: [Shown when relevant]                                   │
│ Assignment timezone: [Shown when relevant]                                 │
│ Travelling worker: [Location/timezone confirmation when relevant]          │
│ Daylight-saving transition: [Warning shown when applicable]                │
│ Cross-midnight shift: starts [Date] 22:00, ends [Next date] 06:00          │
│ The page always states which timezone is being edited.                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORKER PRIVACY AND EMPLOYER VISIBILITY                                     │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE GENERALLY │ AUTHORIZED STAFF │
│ Private reason             │ Available                  │ Audit history    │
│ Private notes              │ Unavailable                │ Conflict details │
│ Personal calendar content  │ Assignment conflict        │ Support data     │
│ Draft edits                │ Response pending           │ Change history   │
│ Detailed exception details │ Relevant time window       │ where required   │
│ Private reasons remain private unless separately authorized.               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI AVAILABILITY ASSISTANT - SUGGESTIONS ONLY                              │
│ AI may suggest recurring schedules, detect conflicts, suggest gaps, and    │
│ recommend updates after repeated declines.                                 │
│ AI must never accept shifts, decline shifts, cancel commitments, expose     │
│ private calendar information, or modify availability without confirmation. │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe Revision

Mobile must make day/week editing simple without compressing a dense desktop calendar.

```text
┌──────────────────────────────┐
│ Availability          Help   │
│ Editing: worker timezone     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ STAFFING READINESS           │
│ Today: available after 14:00 │
│ Tomorrow: 07:00-15:00        │
│ Urgent: interested           │
│ Travel: 20 km preference     │
│ Not guaranteed assignment    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ THIS WEEK                    │
│ Mon Available 07-15          │
│ Tue Available 07-15          │
│ Wed Partial + conflict       │
│ Thu Accepted shift 14-22     │
│ Fri Unavailable              │
│ [Edit day] [Edit week]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ QUICK ACTIONS                │
│ [Add exception]              │
│ [Add recurring schedule]     │
│ [Block time]                 │
│ [Review conflicts]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROTECTED COMMITMENT         │
│ Accepted shift Thu 14-22     │
│ Availability edits cannot    │
│ cancel this shift.           │
│ [View assignment] [Support]  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONFLICT                     │
│ High severity                │
│ Unavailable overlaps shift   │
│ [Edit block] [Keep shift]    │
└──────────────────────────────┘
```

## 6. Recurring Schedule and Exception Rules

Recurring schedule UX must support:

- Weekly recurrence.
- Alternating weeks.
- Rotating schedules.
- Overnight recurrence.
- Holiday overrides.
- Temporary recurring exceptions.

Every modification must explain whether it affects:

- One occurrence.
- Future occurrences.
- The entire series.

No recurrence logic is implemented in this wireframe.

## 7. Conflict Resolution Model

Conflict cards must include:

- Conflict explanation.
- Severity.
- Recommended action.
- Safe resolution path.

Conflict types include:

- Overlapping availability.
- Overlapping assignments.
- Leave conflicts.
- Training conflicts.
- Timezone conflicts.
- Overnight conflicts.
- Duplicate recurrence.
- Stale edits from another device.

Conflict detection must not automatically overwrite, cancel, accept, decline, or alter commitments.

## 8. Privacy and Staffing Readiness

Availability supports staffing readiness without becoming dispatch.

Operational indicators may include:

- Available today.
- Available tomorrow.
- Recurring availability.
- Urgent availability.
- Travel willingness.
- Minimum notice.
- Maximum daily hours preference.

These indicators do not guarantee assignment, minimum hours, overtime approval, payroll, or
eligibility.

Workers may mark themselves unavailable without revealing private reasons. Employers generally see
only available, unavailable, assignment conflict, response pending, and relevant time window.

## 9. Self Validation

| Check | Result |
| --- | --- |
| Architecture unchanged | Pass |
| Epic unchanged | Pass |
| Pages 016-021 unchanged | Pass |
| Availability, preference, assignment, and commitment remain independent | Pass |
| Recurring scheduling is unambiguous | Pass |
| Assignment protection is enforced conceptually | Pass |
| Timezone behavior is explicit | Pass |
| Conflict resolution is safe | Pass |
| Employer visibility respects worker privacy | Pass |
| AI cannot alter commitments | Pass |
| No governance or operational risk remains | Pass |
| No implementation started | Pass |
| No Page 023 files created | Pass |
| Unrelated app changes untouched | Pass |

## 10. Governance Confirmation

This document is a low-fidelity wireframe revision only.

No React, frontend, backend, APIs, database models, implementation, deployment, production data,
commit, push, or merge is introduced.
