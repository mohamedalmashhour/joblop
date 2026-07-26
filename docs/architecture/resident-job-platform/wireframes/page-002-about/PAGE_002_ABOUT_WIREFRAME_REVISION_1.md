# Page 002 - About Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 002 - About
Revision date: 2026-07-21
Revision scope: Strengthen "Why Trust Resident Job" section only
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_002_ABOUT.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## Summary Of Changes

Revision 1 resolves the documented Product Design Review condition by strengthening the About
page's trust narrative through trust mechanisms rather than unsupported trust claims.

Changed:

- Added a dedicated "Why Trust Resident Job" section after the Mission Hero.
- Expanded trust language around verification workflows, human oversight, attendance evidence,
  secure document handling, operational transparency, quality assurance, privacy, and auditability.
- Added worker-facing and employer-facing trust statements.
- Preserved country-neutral language.
- Preserved testimonial, metrics, and customer proof restrictions.

Not changed:

- Architecture.
- UX Foundation.
- Navigation.
- Page layout structure beyond the approved trust section insertion.
- Public-page permissions.
- AI advisory boundary.
- Implementation status.

## Trust Rule Applied

This revision uses trust mechanisms, not trust claims.

Allowed trust mechanisms included:

- Verified worker onboarding process.
- Credential verification workflow.
- Background check process where available and applicable.
- Attendance verification.
- Secure document handling.
- AI-assisted workforce matching with human oversight.
- Operational transparency.
- Quality assurance process.
- Privacy and security commitments.
- Auditability.
- Clear communication between employers and workers.

This revision does not include:

- Fake testimonials.
- Fake statistics.
- Invented customer names.
- Unsupported certifications.
- Country-specific regulatory claims.
- Claims that the platform already operates at scale.

## Updated Information Hierarchy

1. Mission and positioning.
2. Why trust Resident Job.
3. Problem Resident Job solves.
4. What the platform does.
5. Who the platform serves.
6. Operating philosophy.
7. AI advisory philosophy.
8. Trust and safety.
9. Worker / employer / contact CTA band.
10. Footer.

## Updated Desktop Wireframe

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

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHY TRUST RESIDENT JOB                                                       │
│                                                                              │
│ Trust is built through controlled workflows, clear records, and human review. │
│                                                                              │
│ [Verified Worker Onboarding] [Credential Verification Workflow]              │
│ [Background Check Process - where available and applicable]                  │
│ [Attendance Verification] [Secure Document Handling]                         │
│ [AI-Assisted Matching With Human Oversight]                                  │
│ [Operational Transparency] [Quality Assurance Process]                       │
│ [Privacy And Security Commitments] [Auditability]                            │
│ [Clear Employer / Worker Communication]                                      │
│                                                                              │
│ Employer trust statement: Employers receive clearer request, approval,        │
│ attendance, communication, and billing records.                               │
│                                                                              │
│ Worker trust statement: Workers are matched according to role, profile,       │
│ availability, and approved employer needs.                                    │
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

## Updated Mobile Flow

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
│ WHY TRUST RESIDENT JOB       │
│ Controlled workflows         │
│ Human review                 │
│ Verification workflows       │
│ Attendance evidence          │
│ Secure documents             │
│ Auditability                 │
│ Clear communication          │
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

## Updated Section Details

### Why Trust Resident Job

Purpose:

- Explain trust through operating mechanisms.
- Build employer confidence without unsupported claims.
- Build worker confidence without promising automatic work or guaranteed earnings.

Content rules:

- Use factual process language.
- Avoid superiority claims.
- Avoid scale claims.
- Avoid legal, regulatory, or certification claims unless separately approved.
- Keep the section country-neutral.

Recommended trust cards:

- Verified Worker Onboarding Process.
- Credential Verification Workflow.
- Background Check Process, where available and applicable.
- Attendance Verification.
- Secure Document Handling.
- AI-Assisted Workforce Matching With Human Oversight.
- Operational Transparency.
- Quality Assurance Process.
- Privacy And Security Commitments.
- Auditability.
- Clear Communication Between Employers And Workers.

Employer-facing message:

- Employers receive clearer request, approval, attendance, communication, and billing records.

Worker-facing message:

- Workers are matched according to role, profile, availability, and approved employer needs.

## State Updates

Empty states:

- If public content fails, keep the mission and trust mechanism summary visible.
- Do not show fake proof, logos, testimonials, metrics, or customer names.

Loading states:

- Load mission, primary CTAs, and trust section before optional visual content.

Error states:

- If optional trust content cannot load, show a short fallback: "Trust information could not load."
- Do not expose technical details.

Success states:

- Lead or interest submissions confirm receipt only.
- Do not imply approval, staffing availability, pricing, dispatch, or worker assignment.

## Confirmation

Architecture unchanged.

UX Foundation unchanged.

Navigation unchanged.

No implementation started.

No React, frontend implementation, backend, database, production data, live integrations, or
deployment work was performed.

Page 003 remains blocked until Page 002 reaches Approved Wireframe v1.0.
