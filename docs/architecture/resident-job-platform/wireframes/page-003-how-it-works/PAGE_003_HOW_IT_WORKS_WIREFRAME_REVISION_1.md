# Page 003 - How It Works Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 003 - How It Works
Revision date: 2026-07-21
Revision scope: Reorganize shared operating flow into before, during, and after shift phases
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_003_HOW_IT_WORKS.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## Summary Of Exact Changes Made

Revision 1 resolves the documented Product Design Review condition by replacing the single linear
shared operating flow with a clearer three-phase lifecycle:

1. Before the Shift.
2. During the Shift.
3. After the Shift.

Each phase separates:

- Worker responsibilities.
- Employer responsibilities.
- Platform responsibilities.

The revision preserves:

- Existing page purpose.
- Existing public navigation.
- Existing worker and employer journey cards.
- AI advisory boundary.
- Country-neutral language.
- No unsupported claims, statistics, customer proof, or operational scale.

## Updated Information Hierarchy

1. Hero: simple promise and role choice.
2. Worker journey overview.
3. Employer journey overview.
4. Shared operating lifecycle: before, during, after.
5. AI-assisted matching with human approval.
6. Trust and recordkeeping layer.
7. FAQ preview / help cues.
8. Worker and employer CTA band.
9. Footer.

## Updated Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   Sign In        │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ HERO                                                                         │
│ How Resident Job works                                                       │
│                                                                              │
│ A clear staffing workflow for workers, employers, and residence operations.  │
│                                                                              │
│ Choose your path:                                                            │
│ [I need staff] [I want shifts]                                               │
│                                                                              │
│ Notice: Public explanation only. No availability, dispatch, or pricing is     │
│ confirmed on this page.                                                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ FOR WORKERS                          │ FOR EMPLOYERS                         │
│                                      │                                       │
│ 1. Create profile                    │ 1. Request staff                      │
│ 2. Add roles and credentials         │ 2. Share shift requirements           │
│ 3. Set availability                  │ 3. Receive AI-assisted suggestions    │
│ 4. Review available shifts           │ 4. Human review and confirmation      │
│ 5. Apply or accept                   │ 5. Track shift and attendance         │
│ 6. Work approved shift               │ 6. Approve timesheet                  │
│ 7. See earnings records              │ 7. Receive billing records            │
│                                      │                                       │
│ [Become a Worker]                    │ [Request Staff]                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SHARED OPERATING LIFECYCLE                                                   │
│                                                                              │
│ ┌──────────────────────┬──────────────────────┬───────────────────────────┐ │
│ │ BEFORE THE SHIFT     │ DURING THE SHIFT     │ AFTER THE SHIFT           │ │
│ │ Status examples:     │ Status examples:     │ Status examples:          │ │
│ │ Pending              │ In Progress          │ Completed                 │ │
│ │ Review Required      │ Coverage Risk        │ Needs Follow-Up           │ │
│ │ Approved             │ Support Needed       │ Dispute Review            │ │
│ └──────────────────────┴──────────────────────┴───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ BEFORE THE SHIFT                                                             │
│                                                                              │
│ Employer                                                                     │
│ - Create or request a shift.                                                 │
│ - Define role, time, location, requirements, and urgency.                    │
│ - Review AI-assisted matches.                                                │
│ - Confirm the selected worker.                                               │
│                                                                              │
│ Worker                                                                       │
│ - Complete and maintain the verified profile.                                │
│ - Set availability.                                                          │
│ - Review the shift details.                                                  │
│ - Accept or apply for the shift.                                             │
│ - Confirm readiness.                                                         │
│                                                                              │
│ Platform                                                                     │
│ - Check eligibility and required credentials.                                │
│ - Detect scheduling conflicts.                                               │
│ - Provide matching recommendations.                                          │
│ - Send confirmations and reminders.                                          │
│                                                                              │
│ Decision line: AI Recommendation → Human Review → Final Decision             │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ DURING THE SHIFT                                                             │
│                                                                              │
│ Worker                                                                       │
│ - Navigate to the workplace.                                                 │
│ - Check in.                                                                  │
│ - Perform the assigned work.                                                 │
│ - Communicate operational issues.                                            │
│ - Check out.                                                                 │
│                                                                              │
│ Employer                                                                     │
│ - Confirm arrival where required.                                            │
│ - View attendance status.                                                    │
│ - Communicate with the worker.                                               │
│ - Request support or replacement when necessary.                             │
│                                                                              │
│ Platform                                                                     │
│ - Record attendance events.                                                  │
│ - Support authorized location/time verification.                             │
│ - Surface lateness, no-show, or coverage risks.                              │
│ - Preserve an auditable activity record.                                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AFTER THE SHIFT                                                              │
│                                                                              │
│ Worker                                                                       │
│ - Review submitted hours.                                                    │
│ - Report corrections if needed.                                              │
│ - View earnings/payment status.                                              │
│ - Provide appropriate feedback.                                              │
│                                                                              │
│ Employer                                                                     │
│ - Review and approve the timesheet.                                          │
│ - Report discrepancies.                                                      │
│ - Receive the invoice.                                                       │
│ - Rate the completed assignment where permitted.                             │
│                                                                              │
│ Platform                                                                     │
│ - Finalize the timesheet workflow.                                           │
│ - Generate billing records.                                                  │
│ - Calculate worker compensation according to approved rules.                 │
│ - Maintain the audit trail.                                                  │
│ - Surface unresolved disputes for human review.                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI ASSISTANCE                                                                │
│ AI helps organize information, identify missing details, and suggest matches. │
│                                                                              │
│ AI Recommendation → Human Review → Final Decision                             │
│                                                                              │
│ AI does not hire, assign, dispatch, approve timesheets, pay, discipline, or   │
│ make compliance decisions by itself.                                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TRUST AND RECORDKEEPING                                                      │
│ [Verified Onboarding] [Credentials] [Attendance Evidence] [Documents]        │
│ [Communication Records] [Auditability] [Privacy Commitments]                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ COMMON QUESTIONS                                                             │
│ What roles are supported? How are workers reviewed? How do employers request?│
│ [View FAQ]                                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CTA BAND                                                                     │
│ [Request Staff] [Become a Worker] [Contact Us]                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Updated Mobile Flow

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
│ [Request Staff]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ HOW RESIDENT JOB WORKS       │
│ Choose your path             │
│ [I need staff]               │
│ [I want shifts]              │
│ Public explanation only      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FOR WORKERS                  │
│ Create profile               │
│ Add roles and credentials    │
│ Set availability             │
│ Review shifts                │
│ Apply or accept              │
│ Work approved shift          │
│ See earnings records         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FOR EMPLOYERS                │
│ Request staff                │
│ Share shift requirements     │
│ Review suggestions           │
│ Confirm assignment           │
│ Track shift                  │
│ Approve timesheet            │
│ Receive billing records      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ BEFORE THE SHIFT             │
│ Employer: request and confirm│
│ Worker: profile, availability│
│ Platform: eligibility,       │
│ conflicts, recommendations   │
│ AI Recommendation            │
│ ↓                            │
│ Human Review                 │
│ ↓                            │
│ Final Decision               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ DURING THE SHIFT             │
│ Worker: travel, check in,    │
│ work, communicate, check out │
│ Employer: view attendance,   │
│ communicate, request support │
│ Platform: record events and  │
│ surface risk                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AFTER THE SHIFT              │
│ Worker: review hours, report │
│ corrections, view earnings   │
│ Employer: approve timesheet, │
│ invoice, feedback            │
│ Platform: billing records,   │
│ compensation rules, audit    │
│ trail, disputes for review   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI IS ADVISORY               │
│ Suggestions only             │
│ Human approval required      │
│ No automatic dispatch        │
│ No automatic pay approval    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRUST LAYER                  │
│ Verification                 │
│ Credentials                  │
│ Attendance evidence          │
│ Auditability                 │
│ Privacy commitments          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NEXT STEP                    │
│ [Request Staff]              │
│ [Become a Worker]            │
│ [Contact Us]                 │
└──────────────────────────────┘
```

## Status Label Mapping

Before the Shift:

- Pending.
- Review Required.
- Approved.

During the Shift:

- In Progress.
- Coverage Risk.
- Support Needed.

After the Shift:

- Completed.
- Needs Follow-Up.
- Dispute Review.

Status labels must use text, not color alone.

## Design Requirements Confirmed

- Worker, Employer, and Platform responsibilities remain visually distinct.
- Timeline is understandable on desktop and mobile.
- AI is not presented as making final hiring, assignment, timesheet, payment, or disciplinary
  decisions.
- AI Recommendation → Human Review → Final Decision is shown where applicable.
- No country-specific employment, payroll, healthcare, or background-check claims were added.
- No claim implies that all verification methods are available in every jurisdiction.
- No customer proof, statistics, or operational scale were invented.
- No new architecture, permissions, data entities, APIs, or functionality were introduced.
- Existing navigation and page purpose are preserved.

## Design Debt Handling

Optional enhancements remain in the Design Debt Register rather than being added to this revision:

- Role-specific how-it-works pages.
- Explainer video.
- Interactive workflow preview.
- Region-specific workflow details.
- Advanced public search or saved views.

## Confirmation

Architecture Freeze v1.0 is unchanged.

UX Foundation is unchanged.

Navigation is unchanged.

Page 004 remains blocked until Page 003 reaches Approved Wireframe v1.0.

No implementation work began.

No React, frontend implementation, backend, database, production data, live integrations, or
deployment work was performed.
