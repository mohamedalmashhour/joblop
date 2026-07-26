# Page 009 - Become A Worker Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 009 - Become A Worker
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_009_BECOME_A_WORKER.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Design system reference: `docs/architecture/resident-job-platform/ux-foundation/01_GLOBAL_DESIGN_SYSTEM.md`
Navigation reference: `docs/architecture/resident-job-platform/ux-foundation/02_NAVIGATION_ARCHITECTURE.md`
Implementation: Not authorized
Registration form: Not included
Document upload implementation: Not authorized
Authentication: Not authorized
Production data: Not used

## Summary Of Changes

Revision 1 is strictly limited to strengthening worker trust and safety.

Added:

- Dedicated "Your Safety and Trust" section.
- Expectation Management comparison callout.
- Worker Rights During The Process section.
- Worker Responsibilities section.
- Reinforced AI Transparency.
- Safety Escalation path.

Not changed:

- Architecture Freeze v1.0.
- UX Foundation.
- Navigation.
- Design System.
- Page purpose.
- Public website page sequence.
- Authentication, registration, verification, or document-upload implementation.

## A. Purpose

The Become A Worker page is the public gateway into the Worker Portal and the beginning of the
complete worker journey.

It is not the registration form, not the verification system, and not an employment offer.

The page must build worker confidence without promising employment, approval, eligibility, specific
shifts, wages, or legal outcomes.

## B. Revised Information Hierarchy

1. Hero and worker value proposition.
2. No-guarantee trust notice.
3. Healthcare and support role categories.
4. Why Join Resident Job.
5. Your Safety and Trust.
6. Worker Journey timeline.
7. Expectation Management.
8. Verification workflow.
9. Availability and preferences.
10. Worker Rights During The Process.
11. Worker Responsibilities.
12. AI Transparency.
13. Safety Escalation.
14. Support and related documents.
15. Required states.
16. Final CTA.

## C. Desktop Wireframe Revision 1

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
│ approval, eligibility, specific shifts, or wages from this page.              │
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
│ YOUR SAFETY AND TRUST                                                        │
│                                                                              │
│ Resident Job is designed to support safer, clearer staffing workflows through │
│ platform mechanisms, not promises of outcomes.                               │
│                                                                              │
│ Platform mechanisms:                                                         │
│ - Verified employer onboarding.                                              │
│ - Worker identity and credential review workflow.                            │
│ - Clear shift information before acceptance.                                 │
│ - Transparent attendance records.                                            │
│ - Secure communication channels.                                             │
│ - Privacy-aware handling of personal information.                            │
│ - Human review for operational issues.                                       │
│ - Auditability of important actions.                                         │
│                                                                              │
│ Verified employer onboarding     Worker identity and credential review        │
│ Employer context is reviewed     Submitted worker information follows a       │
│ before platform use.             review workflow before relevant access.      │
│                                                                              │
│ Clear shift information          Transparent attendance records               │
│ Role, time, location, and        Check-in, check-out, and timesheet events    │
│ requirements shown before        are designed to be visible and auditable.    │
│ acceptance.                                                                  │
│                                                                              │
│ Secure communication channels    Privacy-aware personal information handling  │
│ Worker/client communication      Personal data handling is designed around    │
│ routes through controlled        privacy, security, and governance controls.  │
│ platform paths.                                                              │
│                                                                              │
│ Human review                     Auditability                                 │
│ Operational issues are routed    Important actions are designed to leave an   │
│ for human review where needed.   auditable record.                           │
│                                                                              │
│ These are trust mechanisms. They do not guarantee approval, work, safety,     │
│ earnings, eligibility, or legal outcomes.                                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WORKER JOURNEY                                                               │
│                                                                              │
│ Discover Resident Job -> Create Account -> Complete Profile -> Upload         │
│ Documents -> Verification Review -> Set Availability -> Receive Shift         │
│ Recommendations -> Accept Shift -> Work Shift -> Timesheet -> Payment         │
│ Processing                                                                    │
│                                                                              │
│ Important distinction                                                        │
│ Verification confirms submitted information is reviewed. Approval determines │
│ whether the worker may access relevant platform opportunities. Registration   │
│ alone does not guarantee assignments.                                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ EXPECTATION MANAGEMENT                                                       │
│                                                                              │
│ Registration              ≠ Approval                                         │
│ Verification              ≠ Guaranteed eligibility                           │
│ Approved profile          ≠ Guaranteed shifts                                 │
│ Shift recommendation      ≠ Shift assignment                                  │
│ AI recommendation         ≠ Human decision                                    │
│                                                                              │
│ The platform separates each step so workers understand what has happened,     │
│ what remains pending, and what requires human review or worker action.        │
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
│ This page does not promise approval, │ whether to accept.                     │
│ provider availability, or universal  │                                       │
│ verification coverage.               │ [Set Availability placeholder]         │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ WORKER RIGHTS DURING THE PROCESS     │ WORKER RESPONSIBILITIES               │
│                                      │                                       │
│ Workers can:                         │ Workers are expected to:              │
│ - Review shift details before        │ - Maintain accurate information.       │
│   accepting.                         │ - Keep credentials current where       │
│ - Manage availability.               │   applicable.                          │
│ - Decline opportunities.             │ - Update availability.                 │
│ - Update profile information.        │ - Communicate scheduling conflicts.    │
│ - Request corrections.               │ - Protect account credentials.         │
│ - Contact support.                   │ - Follow workplace requirements.       │
│ - Report active-shift issues.        │                                       │
│ - Raise privacy requests.            │ These are product expectations, not    │
│                                      │ final contractual obligations.         │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI TRANSPARENCY                                                              │
│                                                                              │
│ AI may:                                                                      │
│ - Recommend opportunities.                                                   │
│ - Identify scheduling conflicts.                                             │
│ - Assist matching.                                                           │
│                                                                              │
│ AI does NOT:                                                                 │
│ - Employ workers.                                                            │
│ - Guarantee work.                                                            │
│ - Approve credentials.                                                       │
│ - Discipline workers.                                                        │
│ - Terminate accounts.                                                        │
│                                                                              │
│ Human review and worker choice remain central to onboarding and shift         │
│ acceptance.                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SAFETY ESCALATION                                                            │
│                                                                              │
│ Question -> Support -> Active Shift Support (when applicable) -> Operational │
│ Review                                                                       │
│                                                                              │
│ Ordinary operational questions should use platform support channels.          │
│ Immediate medical or public-safety emergencies should use local emergency     │
│ services. This page does not hardcode emergency numbers.                     │
│ Immediate medical or public-safety emergencies should use local emergency     │
│ services.                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

Safety note: Immediate medical or public-safety emergencies should use local emergency services.

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

## D. Mobile Flow Revision 1

```text
┌──────────────────────────────┐
│ BECOME A WORKER              │
│ [Create Account]             │
│ [Learn More]                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ IMPORTANT                    │
│ Registration, verification,  │
│ approval, and shifts are     │
│ separate. No employment,     │
│ approval, eligibility, wage, │
│ or shift is guaranteed.      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ YOUR SAFETY AND TRUST        │
│ Verified employer onboarding │
│ Identity/credential review   │
│ Clear shift information      │
│ Attendance records           │
│ Secure communication         │
│ Privacy-aware handling       │
│ Human review                 │
│ Auditability                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EXPECTATION MANAGEMENT       │
│ Registration ≠ Approval      │
│ Verification ≠ Eligibility   │
│ Approved profile ≠ Shifts    │
│ Recommendation ≠ Assignment  │
│ AI recommendation ≠ Decision │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORKER JOURNEY               │
│ Discover -> Account ->       │
│ Profile -> Documents ->      │
│ Verification -> Availability │
│ -> Recommendations -> Accept │
│ -> Work -> Timesheet ->      │
│ Payment Processing           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORKER RIGHTS                │
│ Review details               │
│ Manage availability          │
│ Decline opportunities        │
│ Update profile               │
│ Request corrections          │
│ Contact support              │
│ Report active-shift issues   │
│ Raise privacy requests       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ RESPONSIBILITIES             │
│ Accurate information         │
│ Current credentials where    │
│ applicable                   │
│ Updated availability         │
│ Conflict communication       │
│ Account protection           │
│ Workplace requirements       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI TRANSPARENCY              │
│ AI recommends and assists.   │
│ AI does not employ, approve, │
│ guarantee work, discipline,  │
│ or terminate accounts.       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SAFETY ESCALATION            │
│ Question -> Support ->       │
│ Active Shift Support ->      │
│ Operational Review           │
│ Immediate emergencies use    │
│ local emergency services.    │
└──────────────────────────────┘
```

## E. Required States Revision 1

### Empty

Show public worker messaging, role categories, trust mechanisms, and no personalized status.

### Returning Visitor

Show "continue where you left off" placeholder without exposing private data publicly.

### Authenticated Worker

Show "go to Worker Portal" placeholder and avoid asking the worker to register again.

### Not Eligible Yet

Show respectful status placeholder, support route, and privacy-aware explanation. Do not expose
sensitive eligibility details in a public context.

### Verification Pending

Show pending review placeholder and reinforce that verification, approval, and assignments are
separate.

### Verification Approved

Show Worker Portal / Set Availability placeholder. Do not promise assignments.

### Verification Requires More Information

Show secure follow-up placeholder and support route. Do not expose document details publicly.

## F. Accessibility And Mobile Usability

- Trust mechanisms are written as short scannable labels.
- Comparison callout uses text and symbols, not color alone.
- Safety escalation is sequential and screen-reader friendly.
- Mobile layout keeps the no-guarantee boundary near the top.
- CTAs remain clear and touch-friendly.

## G. International Readiness

Revision 1 remains country-neutral.

No:

- Employment law.
- Tax law.
- Licensing guarantees.
- Immigration advice.
- Regional salary claims.
- Country-specific healthcare regulation claims.
- Hardcoded emergency numbers.

## H. Confirmation

- Architecture unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Design System unchanged.
- No employment guarantees added.
- No licensing guarantees added.
- No wage guarantees added.
- No legal promises added.
- Page 010 remains blocked.
- No implementation work began.
- No React work began.
- No frontend work began.
- No backend work began.
- No authentication work began.
- No document upload work began.
- No database work began.
- No deployment work began.
- No production data was used.
