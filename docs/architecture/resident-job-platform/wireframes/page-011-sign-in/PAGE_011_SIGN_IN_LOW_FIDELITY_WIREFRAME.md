# Page 011 - Sign In Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created - awaiting owner review
Page: 011 - Sign In
Epic: Epic 2 - Authentication
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_011_SIGN_IN.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Authentication planning reference: `docs/architecture/resident-job-platform/wireframes/EPIC_002_AUTHENTICATION_PLANNING.md`
Design system reference: `docs/architecture/resident-job-platform/ux-foundation/01_GLOBAL_DESIGN_SYSTEM.md`
Navigation reference: `docs/architecture/resident-job-platform/ux-foundation/02_NAVIGATION_ARCHITECTURE.md`
Permission reference: `docs/architecture/resident-job-platform/ux-foundation/05_PERMISSION_MATRIX.md`
Implementation: Not authorized
Authentication APIs: Not authorized
Authentication provider integration: Not authorized
Database schema: Not authorized
Production data: Not used

## A. Purpose

The Sign In page helps returning users access Resident Job and continue to the correct destination after successful authentication.

This page must clearly separate account access from operational approval.

Authentication does not equal:

- Authorization.
- Identity verification.
- Credential verification.
- Worker approval.
- Employer approval.
- Employment.

## B. Primary User

Primary users:

- Worker.
- Employer.
- Scheduler.
- Administrator.
- Support.
- Super Administrator.

Secondary stakeholders:

- Product owner.
- Security reviewer.
- Compliance reviewer.
- Operations reviewer.

## C. User Goals

Users should be able to:

1. Understand they are signing in to an existing account.
2. Enter email and password safely.
3. Show or hide the password.
4. Choose remember-me behavior as a convenience option only.
5. Recover a forgotten password.
6. Create an account if they do not already have one.
7. Understand why sign-in may fail.
8. Understand locked-account and email-not-verified states.
9. Continue to the correct next screen after successful authentication.

## D. Information Hierarchy

1. Welcome and page purpose.
2. Sign In form.
3. Security and privacy notice.
4. Remember-me control.
5. Primary sign-in action.
6. Forgot password.
7. Create account.
8. Authentication boundary notice.
9. Error and blocked-state patterns.
10. AI boundary.
11. Help and support path.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ            │
│                                             [Request Staff] [Become Worker]  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ WELCOME                              │ SIGN IN                                │
│                                      │                                       │
│ Access your Resident Job account.   │ Email                                 │
│                                      │ [____________________________________] │
│ After sign-in, your next screen is   │                                       │
│ determined by your role, account     │ Password                              │
│ status, verification status, and     │ [__________________________] [Show]   │
│ approved permissions.                │                                       │
│                                      │ [ ] Remember this device              │
│ Authentication gives account access. │     Convenience only. May still require│
│ It does not approve work, employers, │     security checks or 2FA.           │
│ credentials, shifts, or employment.  │                                       │
│                                      │ [Sign In]                             │
│                                      │                                       │
│                                      │ Forgot password?                      │
│                                      │ Create account                        │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION BOUNDARY                                                      │
│                                                                              │
│ Authentication answers: Who is attempting to access the system?              │
│ Authorization answers: What is this authenticated user allowed to do?        │
│                                                                              │
│ Sign-in does not:                                                             │
│ - verify identity                                                             │
│ - verify credentials                                                          │
│ - approve a worker                                                            │
│ - approve an employer                                                         │
│ - confirm shift eligibility                                                   │
│ - create employment                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONTINUE AFTER SUCCESSFUL AUTHENTICATION                                     │
│                                                                              │
│ Worker                         Employer                     Scheduler/Admin   │
│ → Worker home                   → Employer dashboard         → Authorized area │
│ → Profile status                → Organization status        → Permissioned    │
│ → Available shifts if eligible  → Staffing request context     workspace      │
│                                                                              │
│ Destination depends on account status, role, organization membership,         │
│ verification status, and permission grants.                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ AUTHENTICATION ERRORS                │ LOCKED OR RESTRICTED ACCOUNT           │
│                                      │                                       │
│ Invalid credentials                  │ Your account cannot continue from     │
│ "We could not sign you in with the   │ this screen.                          │
│ information provided."              │                                       │
│                                      │ Next steps:                           │
│ Do not reveal whether the email      │ - Review the account message.         │
│ exists.                              │ - Contact support if needed.          │
│                                      │ - Follow the recovery path if offered.│
│ Missing email/password               │                                       │
│ Clear field-level message.           │ Do not expose internal security logic.│
│                                      │                                       │
│ Too many attempts                    │                                       │
│ Generic retry/help message.          │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ EMAIL NOT VERIFIED                   │ SECURITY AND PRIVACY                   │
│                                      │                                       │
│ Your email still needs verification. │ We use sign-in information only to    │
│                                      │ help protect account access and route │
│ [Resend verification]                │ you to authorized areas.              │
│ [Change email or contact support]    │                                       │
│                                      │ Important actions may be recorded for │
│ Email verification confirms email    │ security and auditability. Secrets    │
│ ownership only. It does not verify   │ are never shown in the interface.     │
│ identity, credentials, approval, or  │                                       │
│ employment.                          │ Privacy and Terms links remain visible│
│                                      │ for review before sign-in.            │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                  │
│                                                                              │
│ AI may help explain sign-in steps or suggest help content.                    │
│                                                                              │
│ AI cannot sign in for the user, verify identity, approve accounts, reset      │
│ passwords, bypass 2FA, unlock accounts, grant permissions, or decide access. │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FOOTER                                                                       │
│ Privacy   Terms   FAQ   Contact   Accessibility                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Tablet Adaptation

```text
┌──────────────────────────────────────────────┐
│ Resident Job              [Menu]             │
├──────────────────────────────────────────────┤
│ Welcome                                      │
│ Account access only. Permissions come later. │
├──────────────────────────────────────────────┤
│ Sign In                                      │
│ Email                                        │
│ [__________________________________________] │
│ Password                                     │
│ [______________________________] [Show]      │
│ [ ] Remember this device                     │
│ [Sign In]                                   │
│ Forgot password?    Create account           │
├──────────────────────────────────────────────┤
│ Authentication Boundary                      │
│ Authentication ≠ authorization/approval/work │
├──────────────────────────────────────────────┤
│ Error, email-verification, and lock states   │
├──────────────────────────────────────────────┤
│ AI cannot authenticate or decide access.     │
└──────────────────────────────────────────────┘
```

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Resident Job          Menu   │
├──────────────────────────────┤
│ Sign in                      │
│ Access your account.         │
│                              │
│ Account access does not mean │
│ approval to work or request  │
│ staff.                       │
├──────────────────────────────┤
│ Email                        │
│ [__________________________] │
│                              │
│ Password                     │
│ [____________________] [Show]│
│                              │
│ [ ] Remember this device     │
│     Convenience only.        │
│                              │
│ [Sign In]                    │
│                              │
│ Forgot password?             │
│ Create account               │
├──────────────────────────────┤
│ Boundary                     │
│ Authentication ≠ permission  │
│ Authentication ≠ verification│
│ Authentication ≠ employment  │
├──────────────────────────────┤
│ Error states                 │
│ - invalid credentials        │
│ - locked account             │
│ - email not verified         │
│ - too many attempts          │
├──────────────────────────────┤
│ Privacy   Terms   Help       │
└──────────────────────────────┘
```

## H. Navigation Behavior

Entry points:

- Public header Sign In.
- Request Staff authentication boundary.
- Become a Worker account path.
- Password reset return path.
- Email verification return path.

After successful authentication:

- Worker routes to Worker Home or next required profile/verification step.
- Employer routes to Employer Dashboard or organization/account status step.
- Scheduler routes to the authorized scheduling workspace.
- Administrator routes to the authorized admin area.
- Support routes to authorized support workspace.

Routing must depend on role, account status, verification status, organizational membership, and permission grants.

## I. Empty States

- No saved email: show blank email field.
- No active remembered device: remember-me unchecked.
- No account context from previous flow: show neutral sign-in page.
- No authorized destination after sign-in: show account-access success with support or status path, not a blank screen.

## J. Loading States

- Field validation loading.
- Sign-in attempt loading.
- Verification-status check loading.
- Destination-routing loading.

Loading states must not expose security internals or imply success before authentication completes.

## K. Error States

Required error states:

- Missing email.
- Invalid email format.
- Missing password.
- Invalid credentials using neutral language.
- Too many attempts using neutral help language.
- Locked or restricted account.
- Email not verified.
- Network or service unavailable.
- Unknown error with support path.

Errors must not reveal whether an account exists.

## L. Success States

Successful authentication should show:

- Account access confirmed.
- Destination being prepared.
- Role-aware route if authorized.
- Next required step if account is incomplete, unverified, restricted, or missing permission.

Success must not imply worker approval, employer approval, credential verification, shift eligibility, or employment.

## M. Accessibility Considerations

- All fields have visible labels.
- Password show/hide has a text label and accessible state.
- Remember-me checkbox has descriptive helper text.
- Error messages are tied to the relevant fields.
- Focus moves to the first error on failed submission.
- Keyboard navigation reaches every control.
- Primary action meets touch target requirements.
- No critical meaning relies on color alone.
- Plain-language support path is available.

## N. AI Assistant Placement

AI may appear as a small help/support assistant below the form or inside Help.

AI may:

- Explain sign-in steps.
- Suggest FAQ or support content.
- Help users understand account states.

AI must not:

- Sign in for the user.
- Verify identity.
- Verify credentials.
- Approve workers or employers.
- Reset passwords.
- Unlock accounts.
- Bypass two-factor authentication.
- Grant permissions.
- Decide access.

## O. Security Messaging

Security messaging should be visible but calm:

- Use a secure device when possible.
- Do not share passwords.
- Remember-me is optional and device-specific.
- Security checks may still be required.
- Important account events may be recorded for auditability.
- Support can help with access issues but cannot bypass required verification steps.

Do not define tokens, cookies, JWTs, OAuth, session storage, database behavior, or provider implementation.

## P. Privacy Reminders

Privacy reminders should state:

- Sign-in information is used to protect account access and route authorized users.
- Privacy and Terms are available before sign-in.
- Email verification confirms email ownership only.
- Support requests may require additional review.

Do not add jurisdiction-specific privacy claims or legal guarantees.

## Q. Future Expansion Notes

Future controlled work may include:

- Passkeys.
- Enterprise SSO.
- Device management.
- Account activity view.
- Recovery codes.
- Localization.
- Advanced risk review.

These are not part of Page 011 wireframe approval.

## R. Governance Confirmation

- Architecture Freeze v1.0 unchanged.
- UX Foundation unchanged.
- Epic 1 unchanged.
- Epic 2 Authentication Planning approved v1.0.
- Page 012 not created.
- No React work started.
- No frontend work started.
- No backend work started.
- No authentication APIs created.
- No database schema created.
- No deployment work started.
- No production data used.
