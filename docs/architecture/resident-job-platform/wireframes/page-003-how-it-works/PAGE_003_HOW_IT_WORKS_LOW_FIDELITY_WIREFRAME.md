# Page 003 - How It Works Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 003 - How It Works
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_003_HOW_IT_WORKS.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## A. Purpose

The How It Works page explains the operating flow of Resident Job to public visitors and guides
them toward the correct worker or employer path.

The page must show that Resident Job is an operational workforce platform, not a generic job board.
It must preserve worker trust, employer clarity, human approval, data honesty, AI transparency, and
auditability.

## B. Primary User

Primary users:

- Guest.
- Worker.
- Employer.
- Residence Manager.

Secondary users:

- Scheduler.
- Recruiter.
- Support stakeholder.
- Finance or compliance stakeholder evaluating later operational fit.

## C. User Goals

Visitors should understand:

- How a worker moves from registration to verified profile to shift selection.
- How an employer moves from staff request to human-reviewed assignment.
- Where AI assists and where humans decide.
- What happens before, during, and after a shift.
- That no public page confirms worker availability, dispatch, pricing, or payment.

## D. Information Hierarchy

1. Hero: simple promise and role choice.
2. Worker journey overview.
3. Employer journey overview.
4. Shared operating flow.
5. AI-assisted matching with human approval.
6. Trust and recordkeeping layer.
7. FAQ preview / help cues.
8. Worker and employer CTA band.
9. Footer.

## E. Desktop Wireframe

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
│ SHARED OPERATING FLOW                                                        │
│                                                                              │
│ Request / Profile → Verification → AI Recommendation → Human Review →         │
│ Assignment → Attendance → Timesheet → Records                                 │
│                                                                              │
│ Status labels: Pending, Review Required, Approved, Completed, Needs Follow-Up │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI ASSISTANCE                                                                │
│                                                                              │
│ AI helps organize information, identify missing details, and suggest matches. │
│                                                                              │
│ AI Recommendation → Human Review → Final Decision                             │
│                                                                              │
│ AI does not hire, dispatch, pay, approve, reject, or make compliance          │
│ decisions by itself.                                                         │
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

## F. Tablet Adaptation

- Header collapses secondary links into a menu.
- Worker and employer journey cards stack into two full-width cards.
- Shared operating flow becomes a horizontal timeline if space allows.
- AI assistance panel remains immediately after the workflow.
- CTA band remains sticky only if future visual design approves it.

## G. Mobile Wireframe

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
│ OPERATING FLOW               │
│ Request/Profile              │
│ ↓                            │
│ Verification                 │
│ ↓                            │
│ AI Recommendation            │
│ ↓                            │
│ Human Review                 │
│ ↓                            │
│ Final Decision               │
│ ↓                            │
│ Attendance and records       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI IS ADVISORY               │
│ Suggestions only             │
│ Human approval required      │
│ No automatic dispatch        │
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

## H. Navigation Behavior

- Public header remains consistent with Pages 001-002.
- "I need staff" routes to Request Staff.
- "I want shifts" routes to Become A Worker.
- FAQ preview routes to FAQ.
- Contact routes to Contact.
- Sign In remains available but secondary.
- Mobile menu does not expose authenticated-only pages.

## I. Empty States

This public page does not depend on private data.

If public content cannot load:

- Show approved static workflow explanation.
- Keep CTAs visible.
- Do not show fake availability, fake roles, fake pricing, or fake testimonials.

## J. Loading States

- Header, hero, and path CTAs render first.
- Workflow sections may use skeleton cards.
- Avoid blank pages or endless spinners.
- Public page must remain useful even if optional FAQ preview fails.

## K. Error States

If content loading fails:

- Show a short non-technical error.
- Keep role path CTAs available.
- Do not expose stack traces, API details, or internal workflow names.

## L. Success States

If a visitor submits interest:

- Confirm only that the request was received.
- Do not imply worker availability, approval, assignment, pricing, payment, or dispatch.

## M. Accessibility Considerations

- WCAG 2.2 AA target.
- Journey cards use semantic headings.
- Flow arrows must not be the only indicator of order.
- Touch targets are at least 44px.
- CTA labels use action language.
- Status labels use text and not color alone.

## N. AI Assistant Placement

AI assistant placement:

- Optional helper after the AI Assistance section.
- It may explain the workflow and help visitors select the right path.
- It may identify missing information in a public lead form.
- It must be labeled advisory.

AI must not:

- Confirm staffing availability.
- Quote binding prices.
- Create shifts.
- Match named workers.
- Approve dispatch.
- Make compliance or payroll decisions.

## O. Future Expansion Notes

Future enhancements:

- Role-specific how-it-works pages.
- Region-specific pages after localization review.
- Verified customer examples.
- Short explainer video after brand approval.
- Interactive workflow preview after implementation authorization.
- Saved views or advanced public search after governance approval.

## Self Validation

Required sections:

- Complete.

Navigation consistency:

- Passed. Uses public navigation and CTAs consistent with Pages 001-002.

Mobile-first:

- Passed. Mobile flow prioritizes role choice, worker/employer journey, AI boundary, and CTA.

Accessibility:

- Passed at wireframe level.

AI boundaries:

- Passed. AI is advisory and separate from human final decision.

Permission consistency:

- Passed. Public page exposes public information only.

Implementation boundary:

- Passed. No production implementation is introduced.

## Review Gate

Page 003 - How It Works requires Product Design Review before Page 004 begins.

Valid outcomes:

- Approved.
- Approved with documented conditions.
- Remediation required.

No React, frontend implementation, backend, database, production data, live integrations, or
deployment work is authorized.
