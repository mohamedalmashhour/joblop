# Page 009 - Become A Worker Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 009 - Become A Worker
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_009_BECOME_A_WORKER.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Design system reference: `docs/architecture/resident-job-platform/ux-foundation/01_GLOBAL_DESIGN_SYSTEM.md`
Navigation reference: `docs/architecture/resident-job-platform/ux-foundation/02_NAVIGATION_ARCHITECTURE.md`
Financial UX reference: `docs/architecture/resident-job-platform/wireframes/FINANCIAL_UX_STANDARD_V1_0.md`
Content governance reference: `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Policy review reference: `docs/architecture/resident-job-platform/wireframes/POLICY_CONTENT_REVIEW_STANDARD_V1_0.md`
Implementation: Not authorized
Registration form: Not included
Document upload implementation: Not authorized
Authentication: Not authorized
Production data: Not used

## A. Purpose

The Become A Worker page is the public gateway into the Worker Portal and the beginning of the
complete worker journey.

This page is the public gateway into the Worker Portal.

It is not the registration form, not the verification system, and not an employment offer.

The page must help a prospective worker understand:

1. Why work with Resident Job.
2. Who can apply.
3. How onboarding works.
4. What happens after registration.
5. What verification may be required.
6. How shift matching works.
7. What support is available.

## B. Primary User

Primary users:

- Guest worker.
- Returning visitor.
- Future healthcare worker applicant.
- Existing authenticated worker who lands on the public page.

Secondary reviewers:

- Recruiter.
- Support.
- Compliance reviewer.
- Product owner.

## C. User Goals

Users should be able to:

- Understand the worker value proposition quickly.
- Identify whether their role category may fit the platform.
- Understand that registration, verification, approval, and assignments are separate stages.
- Understand that registration does not guarantee approval or work.
- Understand that AI may recommend shifts but workers choose whether to accept.
- Find support, FAQ, Privacy, and Terms links before starting.
- Choose the correct next step: Create Account, Learn More, or View Opportunities.

## D. Information Hierarchy

1. Hero and clear worker value proposition.
2. No-guarantee trust notice.
3. Healthcare role categories.
4. Why Join Resident Job.
5. Worker Journey timeline.
6. Verification workflow.
7. Availability and preferences.
8. AI Transparency.
9. Support and related documents.
10. Required states.
11. Primary and secondary CTAs.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ   Sign In  │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ BECOME A WORKER                                                              │
│                                                                              │
│ Work opportunities for healthcare, senior-living, hospitality, support, and   │
│ facility roles through a secure mobile-first staffing platform.               │
│                                                                              │
│ [Create Account] [Learn More] [View Opportunities]                           │
│                                                                              │
│ Trust notice                                                                 │
│ Registration begins the onboarding journey. Verification, approval, and shift │
│ assignments are separate steps. Resident Job does not guarantee employment,   │
│ approval, or specific shifts from this page.                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ HEALTHCARE AND SUPPORT ROLES                                                 │
│                                                                              │
│ Care Roles                  Kitchen Roles              Facility Roles         │
│ - Registered Nurse          - Chef                     - Housekeeping         │
│ - Licensed Practical Nurse  - Cook                     - Maintenance          │
│ - Personal Support Worker   - Dietary Aide             - Reception            │
│ - Care Aide                                            - Administration       │
│                                                                              │
│ Role names are category examples only. Licensing and eligibility requirements │
│ depend on future jurisdiction, employer, and operational configuration.       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHY JOIN RESIDENT JOB                                                        │
│                                                                              │
│ Flexible scheduling        Verified employers        Mobile-first experience  │
│ Choose availability        Safer work context        Manage shifts anywhere   │
│                                                                              │
│ Transparent earnings       Professional profile      Secure communications    │
│ Earnings visibility        Credentials organized     Worker/client messaging  │
│                                                                              │
│ Attendance tracking        AI-assisted matching      Professional growth      │
│ Check-in/out clarity       Recommendations only      Build work history       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WORKER JOURNEY                                                               │
│                                                                              │
│ Discover Resident Job                                                        │
│        ↓                                                                     │
│ Create Account                                                               │
│        ↓                                                                     │
│ Complete Profile                                                             │
│        ↓                                                                     │
│ Upload Documents                                                             │
│        ↓                                                                     │
│ Verification Review                                                          │
│        ↓                                                                     │
│ Set Availability                                                             │
│        ↓                                                                     │
│ Receive Shift Recommendations                                                │
│        ↓                                                                     │
│ Accept Shift                                                                 │
│        ↓                                                                     │
│ Work Shift                                                                   │
│        ↓                                                                     │
│ Timesheet                                                                    │
│        ↓                                                                     │
│ Payment Processing                                                           │
│                                                                              │
│ Important distinction                                                        │
│ Verification confirms submitted information is reviewed. Approval determines │
│ whether the worker may access relevant platform opportunities. Registration   │
│ alone does not guarantee assignments.                                         │
│ Registration alone does not guarantee assignments.                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ VERIFICATION WORKFLOW                │ AVAILABILITY AND PREFERENCES          │
│                                      │                                       │
│ Workflow areas may include:          │ Workers control:                      │
│ - Identity                           │ - Availability                         │
│ - Credentials                        │ - Preferred locations                  │
│ - Licences                           │ - Preferred roles                      │
│ - Certifications                     │ - Preferred schedules                  │
│ - Background review where applicable │                                       │
│ - Document expiry                    │ AI may recommend shifts based on       │
│                                      │ available information. Workers decide  │
│ This page does not promise approval, │ whether to accept or apply.            │
│                                      │ Workers decide whether to accept.      │
│ provider availability, or universal  │                                       │
│ verification coverage.               │ [Set Availability placeholder]         │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI TRANSPARENCY                                                              │
│                                                                              │
│ AI may:                                                                      │
│ - Recommend shifts.                                                          │
│ - Detect scheduling conflicts.                                               │
│ - Suggest opportunities.                                                     │
│                                                                              │
│ AI does NOT:                                                                 │
│ - Employ workers.                                                            │
│ - Guarantee assignments.                                                     │
│ - Discipline workers.                                                        │
│ - Terminate workers.                                                         │
│ - Make final operational decisions.                                          │
│                                                                              │
│ Human review and worker choice remain central to the onboarding and shift     │
│ acceptance process.                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SUPPORT AND RELATED DOCUMENTS                                                │
│                                                                              │
│ [FAQ] [Contact] [Active Shift Support] [Privacy] [Terms]                     │
│                                                                              │
│ Support can help with onboarding questions, document status questions, and    │
│ shift support routing. This page does not provide legal, tax, immigration, or │
│ licensing advice.                                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FINAL CTA                                                                    │
│                                                                              │
│ Ready to begin your worker journey?                                          │
│ [Create Account] [Learn More] [View Opportunities]                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Tablet Adaptation

```text
┌──────────────────────────────────────────────┐
│ Header / menu                                │
├──────────────────────────────────────────────┤
│ Become A Worker hero                         │
│ [Create Account] [Learn More]                │
├──────────────────────────────────────────────┤
│ Trust notice                                 │
├──────────────────────┬───────────────────────┤
│ Care roles           │ Kitchen roles          │
│ Facility roles       │ Admin/support roles     │
├──────────────────────┴───────────────────────┤
│ Why Join Resident Job                         │
│ Two-column benefit cards                      │
├──────────────────────────────────────────────┤
│ Worker Journey vertical timeline              │
├──────────────────────┬───────────────────────┤
│ Verification         │ Availability           │
├──────────────────────┴───────────────────────┤
│ AI Transparency                               │
├──────────────────────────────────────────────┤
│ Support links + final CTA                     │
└──────────────────────────────────────────────┘
```

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ BECOME A WORKER              │
│ Work opportunities that fit  │
│ your availability.           │
│ [Create Account]             │
│ [Learn More]                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ IMPORTANT                    │
│ Registration starts the      │
│ journey. Verification,       │
│ approval, and assignments    │
│ are separate. No work is     │
│ guaranteed from this page.   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ROLE CATEGORIES              │
│ Care                         │
│ Kitchen                      │
│ Facility                     │
│ Administration               │
│ Licensing varies by future   │
│ rules and jurisdiction.      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHY JOIN                     │
│ Flexible schedule            │
│ Verified employers           │
│ Transparent earnings         │
│ Mobile-first shifts          │
│ Secure communication         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORKER JOURNEY               │
│ 1 Discover Resident Job      │
│ 2 Create Account             │
│ 3 Complete Profile           │
│ 4 Upload Documents           │
│ 5 Verification Review        │
│ 6 Set Availability           │
│ 7 Receive Recommendations    │
│ 8 Accept Shift               │
│ 9 Work Shift                 │
│ 10 Timesheet                 │
│ 11 Payment Processing        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ VERIFICATION                 │
│ Identity                     │
│ Credentials                  │
│ Licences                     │
│ Certifications               │
│ Background review where      │
│ applicable                   │
│ Document expiry              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AVAILABILITY                 │
│ You control availability,    │
│ locations, roles, schedules. │
│ AI may recommend. You decide │
│ whether to accept.           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI TRANSPARENCY              │
│ AI recommends shifts and     │
│ detects conflicts. It does   │
│ not employ, guarantee work,  │
│ discipline, terminate, or    │
│ make final decisions.        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SUPPORT                      │
│ FAQ                          │
│ Contact                      │
│ Active Shift Support         │
│ Privacy                      │
│ Terms                        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ [Create Account]             │
│ [View Opportunities]         │
└──────────────────────────────┘
```

## H. Navigation Behavior

- Header keeps public navigation consistent with Pages 001-008.
- `Create Account` routes conceptually to Page 012 - Create Account.
- `Learn More` routes conceptually to Page 003 - How It Works or a local section anchor.
- `View Opportunities` routes conceptually to future public/worker opportunity discovery, subject to
  access rules.
- FAQ, Contact, Privacy, and Terms route to approved public pages.
- Active Shift Support is a conceptual support destination and does not create a support-ticket
  implementation.

## I. Required States

### Empty

Show the page with no personalized status and general public worker messaging.

### Returning Visitor

Show a compact "continue where you left off" placeholder without exposing private data publicly.

### Authenticated Worker

Show a "go to Worker Portal" placeholder and avoid asking the worker to register again.

### Not Eligible Yet

Show a respectful status placeholder and support/FAQ links. Do not disclose sensitive eligibility
details in a public context.

### Verification Pending

Show a pending review placeholder and remind users that verification and approval are separate.

### Verification Approved

Show a Worker Portal / Set Availability placeholder. Do not promise assignments.

### Verification Requires More Information

Show a secure follow-up placeholder and support route. Do not expose document details publicly.

## J. Loading States

- Role category loading skeleton.
- Worker Journey timeline loading skeleton.
- Returning visitor status loading placeholder.
- Support link loading placeholder.

Loading states must not imply that registration, verification, approval, or shifts have been
completed.

## K. Error States

- Unable to load role categories.
- Unable to load returning visitor status.
- Support links temporarily unavailable.
- Create Account route unavailable.

Errors should provide retry and support options without exposing private worker data or system
details.

## L. Success States

Public page success states are limited to navigation confirmation placeholders:

- Account creation started.
- Learn More section opened.
- Opportunities page opened.
- Support page opened.

No worker verification, approval, assignment, payment, or account success is completed on this page.

## M. Accessibility Considerations

- Use clear headings for each section.
- Keep language simple and non-legalistic.
- Use large touch targets for CTA buttons and role-category cards.
- Do not rely on color alone for status states.
- Use keyboard-accessible navigation and CTA order.
- Ensure screen readers can follow the Worker Journey timeline in sequence.
- Keep mobile content scannable and avoid dense tables.

## N. AI Assistant Placement

AI assistance may appear as a compact public explainer:

```text
AI Shift Matching
Resident Job may use AI to recommend relevant shifts after your profile and availability are
complete. Recommendations are not guarantees. Workers choose whether to accept or apply.
```

AI must not appear as an employer, recruiter, disciplinary authority, or final decision maker.

## O. International Readiness

The page remains country-neutral:

- No employment law.
- No tax law.
- No licensing guarantees.
- No immigration advice.
- No regional salary claims.
- No country-specific healthcare regulation claims.

Licensing, background review, and credential requirements are described as future operational and
jurisdiction-specific configuration.

## P. Self Validation

| Gate | Result |
| --- | --- |
| Architecture Freeze v1.0 unchanged | Pass |
| UX Foundation unchanged | Pass |
| Design System consistent | Pass |
| Navigation consistent with Pages 001-008 | Pass |
| Mobile-first flow included | Pass |
| Accessibility covered | Pass |
| AI boundaries explicit | Pass |
| Verification and approval separated | Pass |
| No employment guarantee | Pass |
| No assignment guarantee | Pass |
| No regional licensing rules hardcoded | Pass |
| No implementation work begun | Pass |
| Page 010 remains blocked | Pass |

## Q. Implementation Boundary

No React, frontend, backend, authentication, database, document upload, deployment, production data,
or live verification work is authorized.

This document is a low-fidelity wireframe only.
