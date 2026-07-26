# Page 002 - About Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 002 - About
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_002_ABOUT.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## A. Purpose

The About page explains why Resident Job exists, who it serves, and how it is different from a
generic job board or simple staffing marketplace.

The page must position Resident Job as operational workforce infrastructure for organizations
that need verified workers, urgent staffing workflows, attendance evidence, billing separation,
and human-controlled AI support.

## B. Primary User

Primary users:

- Guest evaluating trustworthiness.
- Employer or residence manager deciding whether to request staff.
- Worker deciding whether to register.
- Agency operator evaluating enterprise fit.

Secondary users:

- Investor or strategic partner.
- Recruiter, scheduler, finance stakeholder, or support stakeholder.

## C. User Goals

Visitors should quickly understand:

- Resident Job exists because staffing shortages are operational problems, not only hiring needs.
- The platform supports senior living, healthcare, and staffing operations.
- Workers and employers have distinct paths.
- AI is advisory and does not make final staffing decisions.
- Trust, verification, records, and human approval are part of the operating philosophy.

## D. Information Hierarchy

1. Mission and positioning.
2. Problem Resident Job solves.
3. What the platform does.
4. Who the platform serves.
5. Operating philosophy.
6. AI advisory philosophy.
7. Trust and safety.
8. Worker / employer / contact CTA band.
9. Footer.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job            How It Works   Pricing   Contact   Sign In           │
│                                         [Request Staff] [Become a Worker]    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ MISSION HERO                                                                 │
│                                                                              │
│ Resident Job helps healthcare and senior-living organizations manage          │
│ workforce operations with verified workers, human approval, and clear records.│
│                                                                              │
│ Supporting copy: staffing shortages affect service continuity, care support,  │
│ meals, housekeeping, maintenance, and operational confidence.                 │
│                                                                              │
│ [Request Staff] [Become a Worker]                                            │
│                                                                              │
│ Visual placeholder: operations command image                                  │
│ Label: Visual placeholder / not production data                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ THE PROBLEM                          │ WHAT RESIDENT JOB DOES                │
│                                      │                                       │
│ Staffing gaps are urgent             │ Worker intake                         │
│ Generic job boards stop at listings  │ Client request intake                 │
│ Verification matters                 │ Group-based staffing categories       │
│ Attendance and billing need records  │ AI-assisted matching                  │
│                                      │ Human approval                        │
│                                      │ Attendance tracking                   │
│                                      │ Billing and worker pay separation     │
│                                      │ Documentation and audit trail         │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHO IT SERVES                                                                │
│ [Senior Residences] [Healthcare Facilities] [Retirement Homes] [Clinics]     │
│ [Long-Term Care Organizations] [Staffing Agencies]                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ OPERATING PHILOSOPHY                                                         │
│ Verify first → Match carefully → Human approval → Track work → Preserve       │
│ records → Separate client billing from worker compensation                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI PHILOSOPHY                                                                │
│ AI can prepare recommendations and identify missing information.              │
│                                                                              │
│ AI Recommendation → Human Review → Final Decision                             │
│                                                                              │
│ AI does not dispatch, approve, pay, or make compliance decisions by itself.   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TRUST AND SAFETY                                                             │
│ [Worker Verification] [Document Controls] [Compliance Posture]               │
│ [No Hidden Automatic Dispatch] [Attendance Evidence] [Reviewable Actions]    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CTA BAND                                                                     │
│ For employers: request staff                                                 │
│ For workers: become a worker                                                 │
│ For partners: contact us                                                     │
│ [Request Staff] [Become a Worker] [Contact Us]                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FOOTER                                                                       │
│ Public links, support, legal, privacy, accessibility                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Tablet Adaptation

- Header compresses secondary links into a menu while keeping primary CTAs visible.
- Mission hero remains first, with visual placeholder below or beside the mission copy.
- Problem and platform-does panels stack into two full-width sections if space is limited.
- Audience cards use a two-column grid.
- Operating philosophy uses a horizontal timeline when space allows and a vertical timeline when
  not.
- CTA band remains full width with separated employer and worker actions.

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
│ [Request Staff]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ MISSION                      │
│ Resident Job helps healthcare│
│ and senior-living teams      │
│ manage verified staffing     │
│ operations.                  │
│                              │
│ [Request Staff]              │
│ [Become a Worker]            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHY IT EXISTS                │
│ Staffing shortages affect    │
│ meals, care support, cleaning│
│ maintenance, and operations. │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHAT IT DOES                 │
│ Worker intake                │
│ Client requests              │
│ AI-assisted matching         │
│ Human approval               │
│ Attendance tracking          │
│ Records and audit trail      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHO IT SERVES                │
│ Senior residences            │
│ Healthcare facilities        │
│ Retirement homes             │
│ Clinics                      │
│ Long-term care organizations │
│ Staffing agencies            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI IS ADVISORY               │
│ AI Recommendation            │
│ ↓                            │
│ Human Review                 │
│ ↓                            │
│ Final Decision               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRUST AND SAFETY             │
│ Verification                 │
│ Document controls            │
│ No automatic dispatch        │
│ Reviewable records           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NEXT STEP                    │
│ [Request Staff]              │
│ [Become a Worker]            │
│ [Contact Us]                 │
└──────────────────────────────┘
```

## H. Navigation Behavior

- Header uses the same public navigation pattern as Page 001.
- Primary CTAs route to Request Staff and Become A Worker.
- Contact CTA routes to the public contact path.
- Sign In remains available but visually secondary to the public conversion paths.
- Mobile menu opens public links without exposing authenticated-only destinations.

## I. Empty States

This public page should not require data to be useful.

If public content cannot load:

- Show approved fallback mission and CTA copy.
- Do not show blank sections.
- Do not show operational, worker, employer, billing, or compliance data.

## J. Loading States

- Mission and navigation render first.
- Optional content blocks can use short skeleton placeholders.
- Avoid large blank panels.
- Visual placeholder labels remain visible if imagery is delayed.

## K. Error States

If content loading fails:

- Show a clear message: "Some page details could not load."
- Keep core mission and CTAs visible.
- Do not expose technical error details.
- Contact CTA remains available.

## L. Success States

If a visitor submits interest from a CTA or lead form:

- Confirm the submission was received.
- Explain the next human follow-up step.
- Do not imply staffing availability, approval, pricing, or dispatch has been confirmed.

## M. Accessibility Considerations

- WCAG 2.2 AA target.
- CTAs must be reachable by keyboard.
- Touch targets must be at least 44px.
- Cards use headings and semantic order.
- Color is not the only way to distinguish status.
- Mobile copy uses short sections and avoids dense paragraphs.

## N. AI Assistant Placement

AI assistant placement:

- Optional public helper near the AI Philosophy section or after the first CTA band.
- Label as advisory.
- Allowed to explain the platform and direct visitors to the right public page.
- Not allowed to quote binding prices, confirm worker availability, match named workers, create
  shifts, approve dispatch, or make compliance determinations.

## O. Future Expansion Notes

Future content can include:

- Founder story excerpt, only after approval.
- Real customer logos, only after permission.
- Real testimonials, only after review.
- Public metrics, only if verified and date-stamped.
- Region-specific pages, only after localization and compliance approval.
- Public trust center.

## Self-Review Against Design Review Checklist

Workflow clarity:

- The page purpose is visible in the first viewport.
- Employer, worker, and contact CTAs are separated.
- AI and human decision authority are visually separated.

Mobile usability:

- Mobile flow starts with mission, problem, CTAs, and audience fit.
- Dense policy copy is deferred.
- Touch actions are separated.

Accessibility:

- Wireframe uses semantic sections and short labels.
- Error and success states are defined.

Healthcare and staffing compliance:

- No private worker, client, health, billing, payroll, or compliance data is exposed.
- No staffing guarantee is claimed.
- Verification and compliance wording is presented as posture and process, not unsupported
  certification.

Permission and security:

- Public page only exposes approved public content.
- Authenticated-only controls are not displayed.

AI transparency:

- AI is clearly advisory.
- Human review and final decision are explicit.

Performance:

- Critical content appears before decorative media.
- The page does not depend on heavy data grids or operational dashboards.

Visual consistency:

- Uses public website structure established by Page 001.
- Keeps worker and employer paths distinct.

## Review Gate

Page 002 - About requires Product Design Review before Page 003 begins.

Valid outcomes:

- Approved.
- Approved with documented conditions.
- Remediation required.

No React, frontend implementation, backend, database, production data, live integrations, or
deployment work is authorized.
