# Page 012 - Create Account Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created - awaiting owner review
Page: 012 - Create Account
Epic: Epic 2 - Authentication
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_012_CREATE_ACCOUNT.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Authentication planning reference: `docs/architecture/resident-job-platform/wireframes/EPIC_002_AUTHENTICATION_PLANNING.md`
Navigation reference: `docs/architecture/resident-job-platform/ux-foundation/02_NAVIGATION_ARCHITECTURE.md`
Permission reference: `docs/architecture/resident-job-platform/ux-foundation/05_PERMISSION_MATRIX.md`
Implementation: Not authorized
Authentication APIs: Not authorized
Database schema: Not authorized
Production data: Not used

## A. Purpose

The Create Account page allows a guest to begin a Resident Job account as a Worker or Employer.

This page creates an account only.

It does not:

- Verify identity.
- Verify credentials.
- Approve workers.
- Approve employers.
- Approve employment.
- Complete onboarding.
- Grant permissions beyond the account-creation flow.

## B. Required Account Journey

The page must show the account journey as separate steps:

```text
Account Creation

Email Verification

Profile Completion

Operational Review (where applicable)

Activation
```

The current page covers only Account Creation.

## C. Primary User

Primary users:

- Guest worker.
- Guest employer.
- Residence manager starting an employer account.
- Agency operator starting an employer account.

Secondary reviewers:

- Support.
- Compliance.
- Security reviewer.
- Product owner.

## D. User Goals

Users should be able to:

1. Choose Worker or Employer account type.
2. Enter basic registration information.
3. Create a password using clear UX-only password requirements.
4. Acknowledge required Terms and Privacy references.
5. Understand email verification is the next step.
6. Understand account creation is not approval.
7. Understand what to do when errors occur.

## E. Information Hierarchy

1. Welcome and account-creation purpose.
2. Account journey boundary.
3. Choose account type.
4. Basic registration fields.
5. Password creation.
6. Consent and policy acknowledgements.
7. Email verification notice.
8. Create account action.
9. Confirmation state.
10. Error states.
11. Security and privacy messaging.
12. AI boundary.
13. Accessibility and mobile behavior.

## F. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ   Sign In  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ WELCOME                              │ CREATE ACCOUNT                         │
│                                      │                                       │
│ Start your Resident Job account.    │ Choose account type                    │
│                                      │                                       │
│ Creating an account is only the      │ ( ) Worker                             │
│ first step. It does not verify       │     I want to find and manage shifts.  │
│ identity, approve credentials,       │                                       │
│ approve workers, approve employers, │ ( ) Employer                           │
│ or create employment.                │     I want to request staffing support.│
│                                      │                                       │
│ Account journey                      │ Basic registration                    │
│ Account Creation                     │ First name / Contact name             │
│ ↓                                    │ [____________________________________]│
│ Email Verification                   │ Last name / Organization contact      │
│ ↓                                    │ [____________________________________]│
│ Profile Completion                   │ Work email                            │
│ ↓                                    │ [____________________________________]│
│ Operational Review where applicable  │ Phone optional / where required       │
│ ↓                                    │ [____________________________________]│
│ Activation                           │                                       │
│                                      │ Password                              │
│                                      │ [__________________________] [Show]   │
│                                      │ Confirm password                      │
│                                      │ [__________________________] [Show]   │
│                                      │                                       │
│                                      │ Password requirements                 │
│                                      │ UX only: clear, strong, not reused,   │
│                                      │ and easy to type on mobile.           │
│                                      │                                       │
│                                      │ [ ] I acknowledge the Terms.          │
│                                      │ [ ] I understand the Privacy Notice.  │
│                                      │                                       │
│                                      │ [Create Account]                      │
│                                      │ Already have an account? Sign in      │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ACCOUNT CREATION BOUNDARY                                                    │
│                                                                              │
│ Account created does not mean:                                                │
│ - identity verified                                                           │
│ - credentials verified                                                        │
│ - worker approved                                                             │
│ - employer approved                                                           │
│ - employment approved                                                         │
│ - onboarding complete                                                         │
│                                                                              │
│ After account creation, the user must verify email and complete the next      │
│ required steps before receiving access to restricted platform functions.      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ WORKER ACCOUNT PATH                  │ EMPLOYER ACCOUNT PATH                  │
│                                      │                                       │
│ Creates a worker account only.       │ Creates an employer account only.     │
│                                      │                                       │
│ Next steps may include:              │ Next steps may include:               │
│ - email verification                 │ - email verification                  │
│ - profile completion                 │ - organization information            │
│ - availability setup                 │ - authorized contact review           │
│ - credential/document workflow       │ - operational or commercial review    │
│ - operational review where needed    │ - permitted staffing-request access   │
│                                      │                                       │
│ No shifts are guaranteed.            │ No staffing access is guaranteed.     │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ EMAIL VERIFICATION NOTICE            │ SECURITY AND PRIVACY                   │
│                                      │                                       │
│ After creating the account, verify   │ Use accurate information.             │
│ the email address before continuing. │ Protect your password.                │
│                                      │ Never share verification codes.       │
│ Email verification confirms email    │ Review Terms and Privacy before       │
│ ownership only. It does not verify   │ creating the account.                 │
│ identity, credentials, approval, or  │                                       │
│ employment.                          │ Important account events may be       │
│                                      │ recorded for security and auditability│
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ACCOUNT CREATION CONFIRMATION                                                │
│                                                                              │
│ Account created. Verify your email to continue.                              │
│                                                                              │
│ [Open Email Verification] [Resend Verification] [Contact Support]            │
│                                                                              │
│ Reminder: this account still may require profile completion and review before │
│ restricted platform actions become available.                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ERROR STATES                                                                 │
│                                                                              │
│ Missing required field      → Enter the required information.                 │
│ Invalid email format        → Check the email address.                        │
│ Password mismatch           → Passwords must match.                           │
│ Password not accepted       → Review the password requirements.               │
│ Terms not acknowledged      → Review and acknowledge required terms.          │
│ Privacy not acknowledged    → Review and acknowledge privacy notice.          │
│ Account cannot be created   → Try again or contact support.                   │
│ Service unavailable         → Try again later or contact support.             │
│                                                                              │
│ Errors must not reveal whether an email or account already exists.            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                  │
│                                                                              │
│ AI may explain account steps or suggest help content.                         │
│                                                                              │
│ AI does not create accounts for users, verify identity, verify credentials,   │
│ approve workers, approve employers, grant permissions, or complete onboarding.│
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FOOTER                                                                       │
│ Privacy   Terms   FAQ   Contact   Accessibility                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

## G. Tablet Adaptation

```text
┌──────────────────────────────────────────────┐
│ Resident Job              [Menu]             │
├──────────────────────────────────────────────┤
│ Create account                               │
│ Account creation only. Approval comes later. │
├──────────────────────────────────────────────┤
│ Choose account type                          │
│ ( ) Worker        ( ) Employer               │
├──────────────────────────────────────────────┤
│ Basic registration                           │
│ Name / contact / email / phone               │
├──────────────────────────────────────────────┤
│ Password + confirm password                  │
│ Show/hide controls                           │
│ UX-only requirements                         │
├──────────────────────────────────────────────┤
│ Terms + Privacy acknowledgements             │
├──────────────────────────────────────────────┤
│ [Create Account]                             │
├──────────────────────────────────────────────┤
│ Next: Email Verification → Profile → Review  │
└──────────────────────────────────────────────┘
```

## H. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Resident Job          Menu   │
├──────────────────────────────┤
│ Create account               │
│ This creates an account only.│
│ It does not approve work or  │
│ staffing access.             │
├──────────────────────────────┤
│ Account journey              │
│ Create → Verify email →      │
│ Profile → Review → Activate  │
├──────────────────────────────┤
│ Account type                 │
│ ( ) Worker                   │
│ ( ) Employer                 │
├──────────────────────────────┤
│ Basic registration           │
│ Name                         │
│ [__________________________] │
│ Email                        │
│ [__________________________] │
│ Phone                        │
│ [__________________________] │
├──────────────────────────────┤
│ Password                     │
│ [____________________] [Show]│
│ Confirm password             │
│ [____________________] [Show]│
│ Requirements are UX guidance │
│ only, not implementation.    │
├──────────────────────────────┤
│ [ ] Terms acknowledgement    │
│ [ ] Privacy acknowledgement  │
│                              │
│ [Create Account]             │
│ Already have account? Sign in│
├──────────────────────────────┤
│ Email verification is next.  │
│ It confirms email ownership  │
│ only.                        │
├──────────────────────────────┤
│ AI: help only, no approval.  │
├──────────────────────────────┤
│ Privacy   Terms   Help       │
└──────────────────────────────┘
```

## I. Account Type Behavior

Worker selection should reveal worker-oriented guidance only:

- You are starting a worker account.
- Approval and eligibility require later steps.
- Profile, availability, and credential workflows are separate.
- No shift access or work is guaranteed.

Employer selection should reveal employer-oriented guidance only:

- You are starting an employer account.
- Organization and authorized-contact review may be required.
- Staffing request access is separate from account creation.
- No worker availability or staffing coverage is guaranteed.

## J. Consent Acknowledgement

Consent acknowledgement should be clear and separate:

- Terms acknowledgement.
- Privacy Notice acknowledgement.
- Optional communication preferences where future policy allows.

The page must not include final legal wording. Legal-facing content remains governed by approved Privacy and Terms pages and legal review.

## K. Email Verification Notice

The page must show before submission and after confirmation:

- Email verification is required before continuing.
- Email verification confirms email ownership only.
- Email verification is not identity verification.
- Email verification is not credential verification.
- Email verification is not worker or employer approval.

## L. Error States

Required error states:

- Missing account type.
- Missing required field.
- Invalid email format.
- Password missing.
- Password confirmation missing.
- Password mismatch.
- Password not accepted.
- Terms acknowledgement missing.
- Privacy acknowledgement missing.
- Account cannot be created.
- Service unavailable.

Errors must avoid revealing whether an email or account already exists.

## M. Accessibility

- All fields have visible labels.
- Account type options have clear labels and descriptions.
- Password show/hide controls have accessible names.
- Requirements are text-based, not color-only.
- Consent checkboxes have clear labels and links.
- Errors are connected to relevant fields.
- Focus moves to the first blocking error.
- Mobile touch targets meet expected size.

## N. Mobile-First Behavior

- Account type appears before form fields.
- Form is short and grouped.
- Terms and Privacy acknowledgements are close to the create action.
- Email verification notice appears before and after account creation.
- Error messages are concise and near the affected fields.

## O. AI Boundaries

AI may:

- Explain the account creation steps.
- Suggest approved FAQ or support content.
- Help users understand visible account states.

AI does not:

- Create accounts for users.
- Verify identity.
- Verify credentials.
- Approve workers.
- Approve employers.
- Approve employment.
- Complete onboarding.
- Grant permissions.
- Bypass email verification.

## P. Security Messaging

Use clear, non-technical security guidance:

- Use your own email address.
- Create a password you do not share.
- Protect your password.
- Never share verification codes.
- Review Terms and Privacy before creating the account.

Do not define password hashing, tokens, sessions, OAuth, cookies, provider behavior, or database schema.

## Q. Confirmation State

After account creation:

```text
Account created.

Verify your email to continue.

Next steps may include profile completion and review before activation.
```

The confirmation must not say the worker, employer, credentials, identity, or employment are approved.

## R. Governance Confirmation

- Architecture Freeze v1.0 unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 013 not created.
- No React work started.
- No frontend work started.
- No backend work started.
- No APIs created.
- No database models created.
- No authentication implementation started.
- No deployment work started.
- No production data used.
