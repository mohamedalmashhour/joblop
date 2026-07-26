# Page 016 - Worker Dashboard Wireframe Revision 1

Status: Approved wireframe candidate
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source: PAGE_016_WORKER_DASHBOARD_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens dashboard hierarchy, operational prioritization, and worker focus.

Changes are strictly limited to:

- Making the top of the dashboard answer the worker's immediate operational questions.
- Organizing widgets into Primary, Secondary, and Tertiary zones.
- Clarifying recommendation, assignment, acceptance, and active-shift states.
- Clarifying earnings as informational, not payroll or settlement.
- Separating AI suggestions from operational status.
- Reducing mobile first-screen density.

No architecture, navigation, Epic 3 Planning, UX Foundation, permissions, APIs, database, or
implementation changes are introduced.

## 2. Worker Dashboard Purpose

The Worker Dashboard is the worker's operational home screen after sign-in.

It must immediately answer:

1. What do I need to do now?
2. Am I currently on shift?
3. Do I have anything requiring immediate attention?
4. What is my next scheduled shift?
5. Is anything blocking my work?

The dashboard is not:

- Scheduler Console.
- Employer Dashboard.
- Admin Dashboard.
- Payroll System.
- Dispatch command center.

## 3. Revised Dashboard Hierarchy

### Primary Zone

The Primary Zone appears first on desktop, tablet, and mobile.

It contains:

- Active Shift.
- Check-in / Check-out.
- Critical Alerts.
- Today's Assignment.

### Secondary Zone

The Secondary Zone supports planning and opportunity discovery.

It contains:

- Upcoming Shifts.
- Calendar.
- Availability.
- Recommended Opportunities.

### Tertiary Zone

The Tertiary Zone contains useful account and follow-up information.

It contains:

- Earnings Summary.
- Messages.
- Notifications.
- Documents.
- Profile Completion.

Tertiary widgets must never receive the same visual weight as the Primary Zone.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Worker Dashboard        Profile  Help │
│ Worker: [Name]                       Account access: Active       Alerts 2│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ NOW - OPERATIONAL PRIORITY                                                │
│ Answers: What do I need to do now? Am I on shift? Is anything blocking me?│
├───────────────────────────────────────┬────────────────────────────────────┤
│ ACTIVE SHIFT / TODAY'S ASSIGNMENT     │ CRITICAL ALERTS                    │
│ Current state: Not currently on shift │ [!] Check-in opens at 06:45        │
│ Today's assignment: Kitchen Cook      │ [!] Credential renewal reminder    │
│ Residence: [Name / Area]              │                                    │
│ Scheduled: 07:00 - 15:00              │ Alert priority: operational first  │
│ Assignment state: Accepted            │ [Review critical alerts]           │
│                                       │                                    │
│ Next required action:                 │                                    │
│ Prepare for check-in window           │                                    │
│ [View assignment] [Get directions]    │                                    │
└───────────────────────────────────────┴────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CHECK-IN / CHECK-OUT                                                       │
│ Status: Check-in not open yet                                              │
│ Worker action: Wait until eligible window or report issue                  │
│ [Check-in unavailable] [Report issue] [Contact active-shift support]       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORK BLOCKERS                                                              │
│ Blocking work today? No critical blocker detected                          │
│ Possible blockers shown here: restricted account, missing required doc,     │
│ schedule conflict, connectivity requirement, or shift-status mismatch.      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SECONDARY - PLANNING AND OPPORTUNITIES                                     │
├──────────────────────────┬──────────────────────────┬──────────────────────┤
│ UPCOMING SHIFTS          │ CALENDAR SUMMARY         │ AVAILABILITY         │
│ Next scheduled shift:    │ This week: 3 shifts      │ Today: available     │
│ Tomorrow, 08:00          │ Open days: 2             │ after 15:30          │
│ [View upcoming]          │ [Open calendar]          │ [Update availability]│
└──────────────────────────┴──────────────────────────┴──────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ RECOMMENDED OPPORTUNITIES - AI SUGGESTIONS ONLY                           │
│ Recommended Shift ≠ Assigned Shift ≠ Accepted Shift ≠ Active Shift         │
│ AI suggests. The worker reviews. Confirmation follows the approved flow.    │
├──────────────────────────┬──────────────────────────┬──────────────────────┤
│ Recommended shift        │ Why suggested            │ Worker action        │
│ Kitchen - Evening        │ Available + group match  │ [Review details]     │
│ Care support - Weekend   │ Possible conflict shown  │ [Review details]     │
└──────────────────────────┴──────────────────────────┴──────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TERTIARY - ACCOUNT AND FOLLOW-UP                                           │
├──────────────────────┬──────────────────────┬──────────────────────────────┤
│ EARNINGS SUMMARY    │ MESSAGES             │ NOTIFICATIONS                │
│ Informational only  │ 2 unread             │ 3 unread                     │
│ Pending payment:    │ [Open messages]      │ [Open notifications]         │
│ awaiting processing │                      │                              │
│ Not payroll, tax,   │                      │                              │
│ settlement, or      │                      │                              │
│ final payment       │                      │                              │
└──────────────────────┴──────────────────────┴──────────────────────────────┘

┌──────────────────────────────┬─────────────────────────────────────────────┐
│ DOCUMENTS                    │ PROFILE COMPLETION                          │
│ 1 item requires attention    │ Profile readiness: mostly complete          │
│ [Review documents]           │ [Review profile]                            │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

The first screen on mobile must answer "What do I need to do now?" without forcing the worker to
scroll through secondary widgets.

```text
┌──────────────────────────────┐
│ Worker Dashboard      Alerts │
│ Account access: Active       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NOW                          │
│ Not currently on shift       │
│ Today's assignment: 07:00    │
│ Next action: prepare to      │
│ check in when eligible       │
│ [View assignment]            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CHECK-IN / CHECK-OUT         │
│ Check-in not open yet        │
│ [Report issue]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CRITICAL ALERTS              │
│ Check-in opens soon          │
│ Credential renewal reminder  │
│ [Review alerts]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORK BLOCKERS                │
│ No critical blocker detected │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NEXT SCHEDULED SHIFT         │
│ Tomorrow, 08:00              │
│ [View upcoming]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SECONDARY                    │
│ Calendar / Availability      │
│ [Open calendar] [Availability]│
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI SUGGESTIONS               │
│ Recommendations only         │
│ Not assignments              │
│ [Review opportunities]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TERTIARY                     │
│ Earnings, messages,          │
│ notifications, documents,    │
│ profile completion           │
│ [Open account items]         │
└──────────────────────────────┘
```

## 6. Widget Priority Rules

Primary widgets:

- Must appear above the fold on mobile where possible.
- Must use stronger visual weight than secondary and tertiary widgets.
- Must not be hidden below recommendations, earnings, messages, or documents.

Secondary widgets:

- May be compacted into summary cards on mobile.
- May link to detailed pages.
- Must not interrupt active-shift actions.

Tertiary widgets:

- May be collapsed when screen space is limited.
- Must not compete visually with the current operational state.
- Must stay clearly separated from payroll, employer billing, and admin functions.

## 7. Shift State Clarity

The dashboard must label shift states clearly:

```text
Recommended Shift
AI or system suggestion only
Worker has not accepted and is not assigned.

Assigned Shift
A shift selected through the approved workflow.
Still may require worker acceptance or confirmation depending on business rules.

Accepted Shift
Worker has accepted or confirmed participation.
Still not active until the shift begins and attendance rules are satisfied.

Active Shift
Worker is in the operational shift window and attendance status is active or being recorded.
```

Never allow a recommendation to appear confirmed.

## 8. Earnings Boundary

Dashboard earnings are informational.

They are not:

- Payroll.
- Final payment.
- Tax calculation.
- Settlement.
- Employer billing.
- Platform margin.

If payment is pending, the dashboard must say so clearly:

```text
Earnings status: Pending
Meaning: recorded for worker visibility, not final settlement.
```

Detailed financial workflow belongs to future earnings and payment pages.

## 9. AI Assistant Boundary

AI Suggestions must be visually distinct from Operational Status.

AI may:

- Recommend shifts.
- Highlight priorities.
- Suggest reminders.
- Detect potential scheduling conflicts.

AI does not:

- Assign work.
- Accept shifts.
- Check workers in.
- Check workers out.
- Approve attendance.
- Approve timesheets.
- Calculate final payment.
- Discipline workers.

The page must preserve:

```text
AI Suggestion
↓
Worker Review
↓
Worker Action or Human Decision
```

## 10. Dashboard Density Rules

- The mobile first screen must prioritize Now, Check-in/Check-out, Critical Alerts, and Work
  Blockers.
- Secondary widgets may be summarized.
- Tertiary widgets may be grouped into one "Account items" card on mobile.
- Visual design must not make every card look equally urgent.
- Long lists must route to detail pages rather than crowding the dashboard.

## 11. Accessibility

- Screen-reader order must follow Primary, Secondary, Tertiary hierarchy.
- Keyboard focus begins with Now, Check-in/Check-out, Critical Alerts, and Work Blockers.
- Critical status uses text labels, not color alone.
- Recommended, assigned, accepted, and active states must have distinct text labels.
- Buttons must use descriptive labels.
- Minimum touch target is 44px.
- Mobile cards must not require horizontal scrolling.

## 12. International Readiness

- Avoid country-specific employment, payroll, healthcare, tax, emergency, or licensing claims.
- Keep date, time, currency, address, and phone formats localization-ready.
- Support future right-to-left layouts.
- Keep legal and operational wording configurable.

## 13. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Worker Portal scope unchanged | Pass |
| Primary operational questions appear first | Pass |
| Widgets organized into Primary / Secondary / Tertiary levels | Pass |
| Recommendations cannot appear confirmed | Pass |
| Earnings clarified as informational, not payroll | Pass |
| AI suggestions separated from operational status | Pass |
| Mobile first screen answers "What do I need to do now?" | Pass |
| No scheduler/admin/employer functionality introduced | Pass |
| No implementation started | Pass |
| Page 017 remains blocked pending approval record | Pass |

## 14. Governance Confirmation

This document is a controlled wireframe revision only.

No React, frontend, backend, APIs, database models, payment integration, production data, or
deployment work is introduced.
