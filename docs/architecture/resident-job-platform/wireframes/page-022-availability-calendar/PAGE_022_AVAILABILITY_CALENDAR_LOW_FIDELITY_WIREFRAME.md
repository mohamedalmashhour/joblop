# Page 022 - Availability Calendar Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Purpose

The Availability Calendar page lets an authenticated worker manage when they are available,
unavailable, or already committed.

The page allows workers to:

- Define normal recurring availability.
- Mark unavailable periods.
- Create one-time availability.
- Manage date-specific exceptions.
- Indicate preferred shift periods.
- Review assignment conflicts.
- Understand timezone and location context.
- Distinguish availability from assignment acceptance.

The page must not:

- Assign shifts automatically.
- Guarantee work.
- Guarantee minimum hours.
- Approve overtime.
- Calculate payroll.
- Override accepted assignments.
- Expose employer-only scheduling controls.
- Treat availability as confirmed attendance.
- Use AI to change availability without worker confirmation.

## 2. Core Boundary

Availability, preferences, assignments, acceptance, attendance, and payroll are distinct.

```text
Available
!=
Assigned

Assigned
!=
Accepted

Accepted
!=
Attended

Preference
!=
Availability

Availability
!=
Guaranteed work

Changing availability
!=
Cancelling an accepted assignment
```

## 3. Availability Concepts

A. General availability

The worker's recurring normal availability.

B. One-time availability

A date-specific period that differs from the recurring pattern.

C. Unavailability

A blocked period where the worker cannot accept assignments.

D. Existing commitments

Assignments, approved leave, or other governed commitments.

E. Preferences

Preferred shifts, roles, locations, or durations. Preferences guide matching. They are not hard
unavailability unless a separate boundary is configured.

## 4. Information Hierarchy

Primary:

- Current week availability.
- Today's status.
- Accepted or confirmed assignments.
- Conflict warnings.
- Save/sync state.
- Timezone indicator.

Secondary:

- Recurring availability.
- One-time exceptions.
- Preferred shift periods.
- Location/travel boundary.
- View switcher.

Tertiary:

- External-calendar future concept.
- Privacy guidance.
- AI suggestions.
- Change history access where authorized.

## 5. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Availability Calendar   Help Profile  │
│ Worker: [Name]                   Timezone: America/Toronto   Saved 10:30  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AVAILABILITY BOUNDARY NOTICE                                               │
│ Availability helps Resident Job recommend opportunities. It does not        │
│ assign shifts, guarantee work, confirm attendance, or cancel accepted work. │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ VIEW CONTROLS                                                              │
│ [Day] [Week] [Month] [List]          [Add availability] [Block time]       │
│ Week view active. Mobile may default to agenda/list.                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WEEK CALENDAR                                                              │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ Mon      │ Tue      │ Wed      │ Thu      │ Fri      │ Sat      │ Sun    │
│ Avail    │ Avail    │ Partial  │ Commit.  │ Unavail. │ Avail    │ Unknown│
│ 07-15    │ 07-15    │ 07-11    │ Shift    │ Personal │ 08-16    │ Set    │
│          │          │ 17-21    │ 14-22    │ blocked  │          │        │
│          │          │ Conflict │ Locked   │ Reason   │          │        │
│          │          │ warning  │          │ private  │          │        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┘
│ Status labels are text-based and not color-only.                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DAY DETAIL PANEL                                                           │
│ Date: Thursday [Configurable date format]                                  │
│ Timezone used for display/edit: Worker timezone                            │
│ Existing commitment: Accepted shift 14:00-22:00                            │
│ Lock: accepted assignments cannot be overwritten by availability edits.     │
│ Change path: use shift cancellation/change workflow, not this page.         │
│ [View shift] [Contact support]                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ RECURRING AVAILABILITY                                                     │
│ Pattern type: [Every weekday / selected weekdays / weekends / alternating] │
│ Date range: [Start date] to [End date or ongoing]                          │
│ Days: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]                            │
│ Time block: [Start time] -> [End time]                                     │
│ Timezone: [Worker timezone]                                                │
│ Location/travel boundary: [Optional operational boundary]                  │
│ [Save draft] [Review recurring changes]                                    │
│ High-impact recurring changes require review before save.                  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ONE-TIME EXCEPTION                                                         │
│ Exception type: [Add availability / Block date / Change hours / Partial]   │
│ Applies to: [This occurrence only] [This and future] [Full pattern]         │
│ Date: [Date]                                                               │
│ Time: [Start] -> [End]                                                     │
│ Private reason: [Worker-only optional note]                                │
│ [Save exception] [Restore recurring pattern]                               │
│ Private reasons are not employer-visible by default.                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ HARD BOUNDARIES VS SOFT PREFERENCES                                        │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ HARD AVAILABILITY BOUNDARY           │ SOFT PREFERENCE                     │
│ Unavailable date/time                 │ Preferred shift period              │
│ Approved leave                        │ Preferred role or department         │
│ Existing accepted assignment          │ Preferred employer/location          │
│ Legally/operationally blocked period  │ Preferred duration                   │
│ Hard boundaries affect scheduling.    │ Preferences guide matching only.     │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT PREFERENCES                                                          │
│ Preferred periods: [Day] [Evening] [Night] [Weekday] [Weekend]             │
│ Duration: [Minimum] [Maximum]                                              │
│ Departments: [Kitchen] [Care] [Housekeeping] [Maintenance]                 │
│ Roles: [Configurable]                                                      │
│ Locations/travel: [Preferred locations] [Travel willingness]               │
│ Urgent same-day assignments: [Interested / Not preferred]                  │
│ Preferences guide matching; they do not guarantee or block every offer.    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TIMEZONE, LOCATION, AND OVERNIGHT                                          │
│ Worker timezone: [Timezone]                                                │
│ Assignment timezone: [Shown where relevant]                                │
│ Daylight-saving notice: [When relevant]                                    │
│ Overnight block example: 22:00 -> 06:00 next day                           │
│ Date ownership: starts [Date] and ends [Next date]                         │
│ Overnight availability is never split ambiguously.                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CONFLICT DETECTION                                                         │
│ Potential conflict: unavailable time overlaps accepted assignment.          │
│ Another conflict: recurring availability overlaps approved leave.           │
│ AI/system may detect conflicts but must not cancel or alter commitments.    │
│ [Review conflict] [Keep assignment] [Contact support]                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SAVE AND SYNC STATE                                                        │
│ Unsaved changes / Saved / Sync pending / Save failed / Offline edit /       │
│ Conflicting update from another device / Last updated [timestamp]           │
│ Recurring-pattern changes require confirmation before final save.           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER VISIBILITY AND PRIVACY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE WHEN      │ AUTHORIZED STAFF │
│ Private reason             │ OPERATIONALLY RELEVANT     │ Audit history    │
│ Private notes              │ Available/unavailable      │ Conflict details │
│ Draft changes              │ Relevant time window       │ Support data     │
│ Personal calendar refs     │ Assignment availability    │ Change history   │
│ Detailed exception reason  │ Travel availability        │ where required   │
│ Employers do not see personal calendar content or private reasons by       │
│ default.                                                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXTERNAL CALENDAR FUTURE CONCEPT                                           │
│ Connected calendar status: Not connected / future capability placeholder   │
│ Sync direction: [Future configurable concept]                              │
│ Last sync: [Future placeholder]                                            │
│ External events display as Busy/Unavailable unless worker authorizes more. │
│ No Google, Apple, Outlook, or provider connection is active in this page.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI AVAILABILITY ASSISTANT - SUGGESTIONS ONLY                              │
│ AI may suggest recurring patterns, detect conflicts, suggest gaps, explain │
│ states, recommend updates after repeated declines, and help format a       │
│ schedule.                                                                  │
│ AI must not change availability without confirmation, accept/reject         │
│ assignments, cancel shifts, infer private reasons, expose personal calendar │
│ details, guarantee work, determine employment eligibility, penalize limited │
│ availability, or rank using protected characteristics.                     │
└────────────────────────────────────────────────────────────────────────────┘
```

## 6. Mobile Wireframe

Mobile prioritizes the weekly agenda, quick edits, clear day status, conflict warnings, large touch
targets, simple time selection, save confirmation, and timezone visibility.

```text
┌──────────────────────────────┐
│ Availability          Help   │
│ Timezone: local / worker     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ THIS WEEK                    │
│ Mon Available 07-15          │
│ Tue Available 07-15          │
│ Wed Partial 07-11 / 17-21    │
│ Thu Accepted shift 14-22     │
│ Fri Unavailable              │
│ [Add] [Block time]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TODAY                        │
│ Status: Accepted assignment  │
│ Availability edits cannot    │
│ cancel this shift.           │
│ [View shift] [Support]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ QUICK EDIT                   │
│ [Add availability]           │
│ [Block time]                 │
│ [Recurring pattern]          │
│ Applies to: this date only   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONFLICT                     │
│ Unavailable time overlaps    │
│ accepted assignment.         │
│ [Review] [Keep assignment]   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Employers see availability   │
│ status, not private reasons. │
└──────────────────────────────┘
```

Avoid a compressed full-month grid as the primary mobile experience.

## 7. Error and Edge States

Required states:

- No availability configured.
- Fully available.
- Fully unavailable.
- Partial day.
- Overlapping blocks.
- Overnight shift.
- Recurring schedule.
- One-time exception.
- Accepted-assignment conflict.
- Approved-leave conflict.
- Timezone changed.
- Daylight-saving transition.
- Offline change.
- Failed save.
- Conflicting update from another device.
- External-calendar sync unavailable.
- Availability unknown.

## 8. Accessibility

- Calendar navigation is keyboard accessible.
- Date and time controls use semantic labels.
- Recurrence controls are accessible and screen-reader friendly.
- Statuses use text labels, not color alone.
- Status and save-state changes are announced.
- Errors are associated with the affected date, time, or pattern.
- Focus moves to the changed block, conflict warning, or failed-save message as appropriate.
- Overnight shifts include clear start/end date labels.
- Conflict explanations use plain language.
- Touch targets are large enough for mobile use.

## 9. International Readiness

Do not hardcode:

- Date format.
- Time format.
- Week start day.
- Timezone.
- Daylight-saving behavior.
- Statutory work rules.
- Maximum hours.
- Availability terminology.
- Public holidays.
- Country-specific scheduling rules.

Keep locale, timezone, role, jurisdiction, and employer configuration separate.

## 10. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze remains intact | Pass |
| Page 022 remains Availability Calendar | Pass |
| Epic 3 Planning remains unchanged | Pass |
| Pages 016-021 remain unchanged | Pass |
| Availability and preference remain separate | Pass |
| Availability and assignment remain separate | Pass |
| Accepted assignments are protected | Pass |
| Changing availability cannot silently cancel an assignment | Pass |
| Soft preferences do not appear as hard restrictions | Pass |
| Private reasons are not exposed | Pass |
| Overnight availability is clear | Pass |
| Timezone is explicit | Pass |
| External calendar integration is placeholder-only | Pass |
| AI cannot modify availability or commitments without confirmation | Pass |
| Employers do not receive unrestricted personal scheduling data | Pass |
| No implementation started | Pass |
| No Page 023 files created | Pass |

## 11. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend, backend, APIs, database models, calendar integrations, external-calendar sync,
deployment, production data, commit, push, or merge is introduced.
