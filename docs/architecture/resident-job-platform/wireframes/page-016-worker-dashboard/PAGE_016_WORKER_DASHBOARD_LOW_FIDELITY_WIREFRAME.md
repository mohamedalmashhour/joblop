# Page 016 - Worker Dashboard Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Purpose

The Worker Dashboard is the operational home screen for an authenticated worker.

It answers five immediate questions:

1. What should I do now?
2. Am I working today?
3. Is anything urgent?
4. Are there new opportunities?
5. Is anything waiting for my action?

The dashboard is a personal worker workspace. It is not a scheduler console, employer dashboard,
admin dashboard, payroll system, or dispatch command center.

## 2. Page Boundaries

The Worker Dashboard may show worker-appropriate summaries and links into deeper worker pages.

It must not expose:

- Client billing.
- Platform margin.
- Employer-only controls.
- Scheduler assignment controls.
- Administrator review tools.
- Payroll processing controls.
- Other workers' private records.

## 3. Information Hierarchy

Primary:

- Today's shift.
- Active operational alerts.
- Check-in or check-out status.

Secondary:

- Availability status.
- Upcoming shifts.
- Calendar summary.
- Shift opportunities presented as recommendations only.

Tertiary:

- Timesheet status.
- Earnings summary, not payroll.
- Messages.
- Notifications.
- Documents requiring attention.
- Quick actions.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Worker Dashboard        Profile  Help │
│ Worker: [Name]                       Status: Active Worker       Alerts 2 │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIMARY OPERATIONS                                                        │
├──────────────────────────────────────────────┬─────────────────────────────┤
│ TODAY'S SHIFT                                │ ACTIVE ALERTS               │
│ Role: Kitchen Cook                           │ [!] Check-in opens soon     │
│ Location: [Residence name / area]            │ [!] Document expires soon   │
│ Time: 07:00 - 15:00                          │                             │
│ Status: Confirmed                            │                             │
│                                              │                             │
│ Check-in status: Not open yet                │ Alert actions:              │
│ [View shift details] [Get directions]        │ [Review alerts]             │
│ [Contact support]                            │                             │
└──────────────────────────────────────────────┴─────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CHECK-IN / CHECK-OUT STATUS                                               │
│ Current state: Awaiting check-in window                                   │
│ Next action: Prepare for arrival                                          │
│ [Check-in disabled until eligible] [Report issue]                         │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┬──────────────┐
│ AVAILABILITY                 │ CALENDAR SUMMARY             │ UPCOMING     │
│ Today: Available after 15:30 │ This week: 3 shifts          │ Next shift   │
│ Tomorrow: Available          │ Open days: 2                 │ Tomorrow     │
│ [Update availability]        │ [Open calendar]              │ [View all]   │
└──────────────────────────────┴──────────────────────────────┴──────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT OPPORTUNITIES - RECOMMENDATIONS ONLY                                │
│ AI may recommend opportunities. The worker decides whether to apply/accept.│
├──────────────────────────────┬──────────────────────────────┬──────────────┤
│ Recommended shift            │ Evidence                     │ Action       │
│ Kitchen - Evening            │ Matches group, available     │ [Review]     │
│ Care support - Weekend        │ Possible conflict detected   │ [Review]     │
└──────────────────────────────┴──────────────────────────────┴──────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────────────┐
│ TIMESHEETS           │ EARNINGS SUMMARY     │ MESSAGES / NOTIFICATIONS     │
│ 1 pending review     │ Estimated worker pay │ 2 unread messages            │
│ [Review timesheet]   │ Payment status link  │ 3 notifications              │
│                      │ Not payroll          │ [Open inbox]                 │
└──────────────────────┴──────────────────────┴──────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DOCUMENTS REQUIRING ATTENTION                                             │
│ Food safety credential: renewal reminder                                  │
│ [Review documents]                                                        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ QUICK ACTIONS                                                             │
│ [Update availability] [Find shifts] [Open calendar] [Contact support]     │
│ [Review documents] [View earnings]                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

Mobile order must preserve operational urgency before general account information.

```text
┌──────────────────────────────┐
│ Worker Dashboard      Alerts │
│ Status: Active Worker        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TODAY'S SHIFT                │
│ Kitchen Cook                 │
│ 07:00 - 15:00                │
│ Confirmed                    │
│ [View details]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CHECK-IN STATUS              │
│ Awaiting check-in window     │
│ [Report issue]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ACTIVE ALERTS                │
│ Check-in opens soon          │
│ Document expires soon        │
│ [Review alerts]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AVAILABILITY                 │
│ Today: Available after 15:30 │
│ [Update availability]        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CALENDAR                     │
│ This week: 3 shifts          │
│ [Open calendar]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ RECOMMENDED OPPORTUNITIES    │
│ AI recommendation only       │
│ [Review shift]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TIMESHEETS                   │
│ 1 pending review             │
│ [Review]                     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EARNINGS SUMMARY             │
│ Worker earnings overview     │
│ Not payroll                  │
│ [View earnings]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ MESSAGES / NOTIFICATIONS     │
│ 2 messages, 3 notifications  │
│ [Open inbox]                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ DOCUMENTS                    │
│ 1 item needs attention       │
│ [Review documents]           │
└──────────────────────────────┘
```

## 6. Tablet Adaptation

- Use a two-column layout.
- Keep Today's Shift and Check-In Status across the top.
- Place Active Alerts beside the primary shift card.
- Group Availability, Calendar, and Recommendations below the primary operations area.
- Keep Messages, Notifications, Timesheets, Earnings, and Documents as compact cards.

## 7. Navigation Behavior

Primary dashboard actions route to deeper worker pages:

- View shift details -> Page 026 Accepted Shift or Page 024 Shift Details, depending on state.
- Update availability -> Page 022 Availability Calendar.
- Find shifts -> Page 023 Search Shifts.
- Review timesheet -> Page 029 Timesheet.
- View earnings -> Page 030 Earnings.
- Open inbox -> Page 033 Messages.
- Review documents -> Page 035 Documents.
- Settings -> Page 036 Settings.

No navigation should expose employer, scheduler, admin, or payroll-only surfaces.

## 8. Dashboard States

### State A - Shift Today

- Today's Shift card is visible and highest priority.
- Check-in or check-out status is visible.
- Alerts related to the current shift appear above recommendations.

### State B - No Shift Today

- Primary card states: "No confirmed shift today."
- Next action options: update availability, review recommendations, or open calendar.
- The page must not imply the worker has an assignment.

### State C - Active Shift

- Current shift status becomes the dominant page element.
- Check-out and support paths are clearly visible.
- Recommendations move lower in the hierarchy.

### State D - Pending Worker Review

- Dashboard may show account access but must label operational access as pending.
- Shift recommendations and acceptance actions are unavailable or clearly limited.

### State E - Restricted / Suspended / Closed Account

- Operational actions are disabled.
- The page explains what happened and the next support path.
- Messaging avoids revealing protected internal decisions.

### State F - Offline or Poor Connectivity

- Today's confirmed shift, shift details previously loaded, calendar summary, and support guidance
  remain visible where available.
- New recommendations, messages, and check-in or check-out actions indicate connectivity is required
  or synchronization is pending.

## 9. Loading, Empty, Error, and Success States

Loading:

- Load primary shift status first.
- Use concise skeleton sections.
- Do not hide urgent alerts behind tertiary content.

Empty:

- No shift today.
- No new recommendations.
- No unread messages.
- No documents requiring attention.

Error:

- Cannot load dashboard.
- Cannot refresh shift status.
- Cannot update availability.
- Connectivity required for this action.

Success:

- Availability updated.
- Timesheet reviewed.
- Message sent.
- Document action completed.

## 10. AI Assistant Placement

AI appears as an advisory strip inside the recommendations area and as a small helper entry point.

AI may:

- Recommend shifts.
- Highlight priorities.
- Detect scheduling conflicts.
- Suggest reminders.

AI must not:

- Accept shifts.
- Check workers in.
- Check workers out.
- Approve timesheets.
- Approve payments.
- Discipline workers.
- Change worker records without explicit worker action and required human approval where applicable.

The UI must show: AI recommendation -> worker review -> worker action or authorized human decision.

## 11. Earnings Boundary

The dashboard may show a worker earnings summary, estimated worker pay, and payment status links.

It must not show:

- Employer billing.
- Client charges.
- Platform commission.
- Margin.
- Payroll processing controls.

Earnings summaries should use labels such as "estimated", "pending", "approved", or "paid" where
applicable.

## 12. Privacy and Security Boundaries

- Show only the authenticated worker's data.
- Location and attendance status must be displayed only for operationally relevant shifts.
- Messages and documents must not expose other workers' private information.
- AI recommendations must not reveal confidential employer, platform, or other-worker data.
- Support links should be visible without exposing internal escalation notes.

## 13. Accessibility

- Primary shift status appears before recommendations in DOM and screen-reader order.
- All widgets have clear headings.
- All action buttons have descriptive labels.
- Minimum touch target is 44px.
- Status colors must have text labels.
- Alerts must not rely on color alone.
- Keyboard focus order follows operational priority.
- The page works without hover-only interactions.
- Dynamic changes are announced politely where appropriate.

## 14. International Readiness

- Avoid country-specific employment, payroll, healthcare, or emergency-service claims.
- Keep all legal, payment, and credential wording configurable.
- Support future localization and right-to-left layouts.
- Avoid hardcoded date, time, currency, phone, or address formats.

## 15. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze v1.0 unchanged | Pass |
| Epic 3 Planning v1.0 respected | Pass |
| Worker Dashboard separated from scheduler/employer/admin/payroll | Pass |
| Today's Shift receives highest priority | Pass |
| Active alerts and check-in/out status are primary | Pass |
| Recommendations are advisory only | Pass |
| Worker earnings remain separate from payroll and employer billing | Pass |
| Mobile-first hierarchy preserved | Pass |
| Accessibility considerations included | Pass |
| No implementation introduced | Pass |
| Page 017 not created | Pass |

## 16. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend implementation, backend, APIs, database, payment integration, live connector,
production data, or deployment work is authorized or introduced.
