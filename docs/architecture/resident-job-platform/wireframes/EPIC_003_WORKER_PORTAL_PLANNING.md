# Epic 3 - Worker Portal Planning

Product: Resident Job
Epic: Epic 3 - Worker Portal
Pages in scope: 016-036
Status: APPROVED v1.0 - Page 016 is the next controlled wireframe gate
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## Purpose

Define the Worker Portal planning boundary before Page 016 - Worker Dashboard is created.

This planning document prepares Epic 3 for controlled low-fidelity wireframe work only. It does not authorize React, frontend, backend, APIs, database, live integrations, authentication implementation, deployment, or production data.

## Worker Portal Objectives

The Worker Portal should help approved and in-progress workers manage their relationship with Resident Job in a clear, mobile-first, trustworthy way.

Objectives:

- Give workers one place to see account, profile, availability, shift, document, earnings, message, and notification status.
- Keep worker approval, credential verification, shift eligibility, and employment boundaries clear.
- Support shift discovery and acceptance without implying guaranteed work.
- Support attendance, timesheet, and earnings transparency without exposing employer billing or platform margin.
- Preserve human review for consequential decisions.
- Keep AI advisory and explainable.
- Support workers in fast operational contexts such as same-day shifts and active-shift issues.

## Worker Journey

The Worker Portal should support the complete worker journey without collapsing distinct operational states.

Recommended journey:

```text
Visitor

Create Account

Email Verified

Profile Completed

Operational Review (where applicable)

Active Worker

Availability Configured

Shift Discovery

Shift Recommendation

Worker Decision

Assignment Confirmed

Check-In

Work Shift

Check-Out

Timesheet Review

Earnings

Payment Status
```

Required separations:

```text
Recommendation

does not equal

Assignment

Assignment

does not equal

Attendance

Attendance

does not equal

Timesheet Approval

Timesheet

does not equal

Payroll
```

Worker Portal pages should make each state visible enough that workers understand where they are in the journey and what action, if any, is available to them.

## Worker Dashboard Scope

Page 016 - Worker Dashboard should become the Worker Portal home screen.

It should summarize:

- Profile status.
- Verification or review status.
- Availability status.
- Upcoming shifts.
- Available shift opportunities where eligible.
- Calendar preview.
- Timesheet alerts.
- Earnings summary.
- Messages.
- Notifications.
- Document tasks.
- Support or active-shift help.
- AI assistant guidance where allowed.

The dashboard must not imply that a worker is approved, eligible, assigned, paid, or employed unless the correct approved state exists.

## Dashboard Boundary

The Worker Dashboard is a personal operational workspace for a worker.

Worker Dashboard is not:

- Scheduler Console.
- Employer Portal.
- Administration.
- Payroll.

The Worker Portal should expose worker-appropriate functionality only:

- The worker's own profile and status.
- The worker's own availability.
- The worker's own shift opportunities and assignments.
- The worker's own attendance and timesheet status.
- The worker's own earnings and payment status.
- The worker's own messages, notifications, documents, and settings.

It must not expose scheduler queues, employer financial records, administrative controls, payroll operations, platform margin, or other workers' private data.

## Worker Navigation

Worker Portal navigation should include:

- Home.
- Available.
- My Shifts.
- Calendar.
- Billing or Earnings.
- Profile.
- Documents.
- Messages.
- Notifications.
- Settings.
- Support.

Navigation should only show destinations the worker is permitted to access. Restricted or pending users should see status and next steps rather than unavailable operational tools.

## Information Architecture

Worker Portal information should be grouped into:

- Account and access.
- Worker profile.
- Availability.
- Shift discovery.
- Accepted shifts.
- Attendance and timesheets.
- Earnings and payments.
- Documents.
- Messages and notifications.
- Settings and support.

The structure should separate:

- Worker-facing earnings from employer billing.
- Worker eligibility from account authentication.
- Worker approval from credential verification.
- Shift recommendations from shift assignments.
- AI guidance from human decisions.

## Dashboard Widgets

Expected dashboard widgets:

- Account status.
- Worker profile completeness.
- Credential/document tasks.
- Availability snapshot.
- Available shifts preview.
- Upcoming shifts.
- Active shift status where applicable.
- Timesheet action required.
- Earnings summary.
- Messages.
- Notifications.
- Support shortcut.
- AI guidance panel.

Widgets should have empty, loading, error, pending, restricted, and success states.

## Availability Management

Availability management should let workers communicate when they are available to work.

Planning principles:

- Availability is worker-managed.
- Availability does not guarantee assignment.
- Availability may be checked against scheduling conflicts and approved rules.
- Workers should be able to update availability from mobile.
- Availability should connect to shift discovery and AI recommendations without giving AI final assignment authority.

## Shift Discovery

Shift discovery should show opportunities appropriate to the worker's status, profile, role groups, location context, availability, credentials where applicable, and approved business rules.

The UX must distinguish:

- Recommended shift.
- Available to apply.
- Already applied.
- Awaiting review.
- Accepted.
- Not eligible.
- Filled or closed.

AI may recommend shifts but must not guarantee assignment.

## Shift Acceptance

Shift acceptance should make workers review key details before accepting:

- Role.
- Location.
- Date and time.
- Department.
- Requirements.
- Pay/earnings information where approved.
- Travel or arrival notes where applicable.
- Cancellation or support guidance where applicable.

Acceptance must not hide employer rules, safety notices, or required confirmations.

## Attendance

Attendance planning should cover the worker-facing experience for active and completed shifts.

Attendance concepts:

- Check-in.
- Check-out.
- Active shift status.
- Attendance corrections.
- Missed check-in workflow.
- Missed check-out workflow.
- Employer visibility.
- Worker visibility.
- Audit trail.

Worker-facing attendance should explain:

- Whether the worker has checked in.
- Whether the worker has checked out.
- Whether an attendance event is pending review.
- Whether a correction is needed.
- Whether employer review is pending.
- Where to get active-shift support.

Employer visibility should be limited to operationally necessary attendance status for the relevant shift and employer context.

Worker visibility should include the worker's own attendance record, correction path, and support path.

The audit trail should make important attendance actions traceable without exposing unnecessary private data.

This planning document does not define GPS implementation, storage, APIs, database models, or attendance calculation rules.

## Calendar

The worker calendar should support:

- Availability.
- Upcoming shifts.
- Accepted shifts.
- Past shifts.
- Timesheet status.
- Earnings or payment status markers where appropriate.
- Notifications and reminders.

Calendar views should be mobile-first and readable in daily, weekly, and monthly contexts where future design supports them.

## Timesheets

Timesheet pages should help workers understand:

- Submitted hours.
- Check-in/check-out status.
- Pending employer review.
- Approved hours.
- Requested corrections.
- Disputed or unresolved items.

Timesheets must remain separate from employer billing and platform margin.

## Earnings

Worker earnings pages should show worker-facing compensation information only.

They should not expose:

- Client billing.
- Platform margin.
- Internal commission formulas.
- Employer financial records.

Earnings should distinguish:

- Estimated earnings.
- Submitted hours.
- Approved hours.
- Pending payout.
- Paid.
- Correction requested.
- Disputed.

## Messages

Messages should support worker communication with appropriate boundaries.

Planning principles:

- Messages should be tied to account, shift, support, or operational context.
- Sensitive information should be protected.
- Workers should have clear escalation paths.
- AI may help draft or summarize where approved, but does not send messages or make decisions without human action where required.

## Notifications

Notifications should cover:

- Shift opportunities.
- Application status.
- Accepted shifts.
- Schedule changes.
- Check-in/check-out reminders.
- Timesheet actions.
- Document tasks.
- Earnings updates.
- Support messages.

Notification UX should avoid panic language except for genuinely urgent active-shift issues.

## Documents

Documents should support worker profile and eligibility workflows without overpromising approval.

Document states:

- Not started.
- Uploaded.
- Under review.
- Approved where applicable.
- Needs correction.
- Expired.
- Not applicable.

Document review does not equal employment, shift eligibility, or assignment.

## Settings

Settings should include:

- Account information.
- Security settings.
- Notification preferences.
- Language/localization readiness.
- Privacy paths.
- Support paths.

Settings must not expose internal security mechanisms.

## AI Assistant Boundaries

AI may:

- Explain visible worker status.
- Suggest profile-completion steps.
- Recommend relevant shifts with evidence.
- Identify scheduling conflicts.
- Suggest support or FAQ content.
- Help draft messages where approved.

AI must not:

- Approve workers.
- Verify credentials.
- Assign shifts.
- Accept shifts for the worker.
- Change availability without worker action.
- Check in or check out for the worker.
- Approve timesheets.
- Decide payment.
- Discipline workers.
- Terminate accounts.
- Override human review.

AI recommendations must remain labeled as recommendations.

## Mobile-First Principles

Worker Portal must be mobile-first because workers may use it before, during, and after shifts.

Principles:

- Fast access to today's shift and next action.
- Large touch targets.
- Clear status labels.
- Minimal typing.
- Scannable cards.
- Offline/error states where connectivity is weak.
- Support path always findable.
- No dense desktop-only tables.

## Offline Behavior

The Worker Portal should plan for weak or interrupted connectivity because workers may use the platform while traveling, arriving, working, or leaving a shift.

Offline UX should distinguish what remains available, what requires connectivity, and what may synchronize later.

| Area | Remain available | Requires connectivity | Synchronize later |
| --- | --- | --- | --- |
| Today's shift | Last loaded shift summary, role, time, location notes where safe | Latest changes, cancellation, replacement status | Viewed-state or acknowledgement where applicable |
| Calendar | Last loaded calendar snapshot | Fresh availability or shift updates | Local availability edits where future rules allow |
| Shift details | Last loaded accepted-shift details | New assignment confirmation or changes | Acknowledgement where applicable |
| Messages | Last loaded conversation snippets where safe | Sending, receiving, attachments | Drafts where future rules allow |
| Notifications | Last loaded notifications | Fresh notification delivery | Read/unread state where future rules allow |
| Check-in | Clear offline warning and support guidance | Final authoritative check-in | Pending event where future engineering approves |
| Check-out | Clear offline warning and support guidance | Final authoritative check-out | Pending event where future engineering approves |
| Support | Emergency guidance and saved contact paths where appropriate | New support case submission | Draft support request where future rules allow |

Offline states must not pretend that time-sensitive actions were completed if connectivity is required for confirmation.

No implementation details, local storage model, queue model, conflict-resolution algorithm, or synchronization API is defined here.

## Accessibility

Worker Portal wireframes must support:

- Visible labels.
- Clear focus order.
- Screen-reader-friendly status changes.
- Plain-language errors.
- High contrast.
- No color-only meaning.
- Large touch targets.
- Readable mobile text.
- Accessible calendar and status alternatives.

## Security Boundaries

Worker Portal must protect:

- Worker personal information.
- Credential/document data.
- Earnings data.
- Messages.
- Shift details.
- Support cases.

Security boundaries:

- Authentication is not authorization.
- Worker approval is separate from account access.
- Credential verification is separate from worker approval.
- Shift eligibility is separate from worker approval.
- Worker earnings are separate from employer billing.
- AI cannot bypass permissions or approvals.

## Privacy Boundaries

Worker Portal privacy must be explicit because workers may manage sensitive personal, professional, financial, communication, attendance, and location-adjacent information.

Privacy areas:

- Worker profile.
- Documents.
- Earnings.
- Messages.
- Attendance.
- Location.
- Calendar.
- AI recommendations.

Required separations:

```text
Worker data

does not equal

Employer data

Worker data

does not equal

Administrator visibility
```

Only the minimum required information should be exposed for operational purposes.

Privacy principles:

- Worker profile data should be shared only where needed for matching, assignment, compliance, support, or approved operational workflows.
- Worker documents should not be exposed broadly to employers or unrelated administrators.
- Worker earnings must remain separate from employer billing and platform margin.
- Worker messages should be visible only to authorized participants and support roles where permitted.
- Attendance data should be visible only in the relevant shift and operational context.
- Location-related information should be limited to operationally necessary status and must not imply unrestricted live tracking.
- Calendar data should expose only what is needed for availability, scheduling, and conflict handling.
- AI recommendations should use only permitted information and should not reveal hidden profile, document, earnings, message, attendance, or location details.

## Dependencies

Epic 3 depends on:

- Architecture Freeze v1.0.
- UX Foundation.
- Design System.
- Navigation Architecture.
- Permission Matrix.
- Financial UX Standard.
- Content Governance Standard.
- Epic 2 Authentication approval.
- Future engineering decisions for live data, messaging, notifications, calendar, document storage, attendance, and payments.

## Out-of-Scope Items

Epic 3 planning does not include:

- React components.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database schema.
- Authentication implementation.
- Worker approval implementation.
- Credential verification implementation.
- Payment implementation.
- Messaging integration.
- Notification integration.
- Calendar integration.
- GPS or attendance implementation.
- Deployment.
- Production data.

## Success Criteria

Epic 3 succeeds when Pages 016-036:

- Give workers a coherent portal.
- Preserve worker trust and safety.
- Make status and next actions clear.
- Keep authentication, approval, verification, eligibility, assignment, and employment separate.
- Support shift discovery and management without overpromising work.
- Keep worker earnings separate from employer billing.
- Preserve AI as advisory.
- Work well on mobile.
- Meet accessibility expectations.
- Preserve security and privacy boundaries.

## Next Gate

Epic 3 Worker Portal Planning is approved as v1.0.

Page 016 - Worker Dashboard is the next controlled wireframe gate.

Do not create Page 016 until the owner explicitly authorizes the first Worker Portal wireframe.

If approved, Page 016 must follow the established lifecycle:

1. Low-Fidelity Wireframe.
2. Self Validation.
3. Product Design Review.
4. Controlled Revision if required.
5. Approval Record.
6. README update.
7. Design Status Matrix update.
8. Continue through Epic 3 page-by-page unless a stop condition is triggered.
