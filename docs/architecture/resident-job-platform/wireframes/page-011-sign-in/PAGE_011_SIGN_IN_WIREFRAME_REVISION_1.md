# Page 011 - Sign In Wireframe Revision 1

Status: Revision 1 complete
Page: 011 - Sign In
Epic: Epic 2 - Authentication
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_011_SIGN_IN.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Authentication planning reference: `docs/architecture/resident-job-platform/wireframes/EPIC_002_AUTHENTICATION_PLANNING.md`
Implementation: Not authorized
Authentication APIs: Not authorized
Database schema: Not authorized
Production data: Not used

## Summary Of Revision 1 Changes

Revision 1 strengthens:

- Authentication boundary visibility.
- Account-state messaging.
- Remember Me expectation management.
- Security messaging.
- Error experience and account-enumeration protection.
- AI boundary language.

Revision 1 does not redesign the page, change navigation, modify architecture, modify Epic 2 Planning, or begin implementation.

## A. Purpose

The Sign In page allows returning users to access an existing Resident Job account.

Signing in confirms account access only.

The page must make one message visible before and after the form:

```text
Signing in confirms access to an account only.

It does not approve work, employers, credentials, identity, shifts, or employment.
```

## B. Primary User

Primary users:

- Worker.
- Employer.
- Scheduler.
- Administrator.
- Support.
- Super Administrator.

## C. User Goals

Users should be able to:

1. Sign in with email and password.
2. Show or hide the password.
3. Use Remember Me as a convenience option only.
4. Recover a forgotten password.
5. Create an account if needed.
6. Understand account-state messages in plain language.
7. Understand that successful sign-in does not guarantee eligibility, approval, permissions, or employment.

## D. Information Hierarchy

1. Welcome and sign-in purpose.
2. Sign In form.
3. Visible authentication boundary notice.
4. Remember Me explanation.
5. Forgot password and create account paths.
6. Account-state messages.
7. Error and security guidance.
8. AI boundary.
9. Privacy, Terms, FAQ, and Contact links.

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
│ Signing in confirms account access  │                                       │
│ only.                               │ Password                              │
│                                      │ [__________________________] [Show]   │
│ It does not confirm worker approval,│                                       │
│ employer approval, credential       │ [ ] Remember Me                       │
│ approval, identity verification,    │     Convenience only. This does not    │
│ shift eligibility, or employment.   │     weaken security, bypass 2FA, or    │
│                                      │     skip future checks.                │
│ After sign-in, your next step       │                                       │
│ depends on account state, role,     │ [Sign In]                             │
│ permissions, and review status.     │                                       │
│                                      │ Forgot password?                      │
│                                      │ Create account                        │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION BOUNDARY                                                      │
│                                                                              │
│ Authentication answers: Who is attempting to access the system?              │
│ Authorization answers: What is this authenticated user allowed to do?        │
│                                                                              │
│ Signing in does NOT confirm:                                                  │
│ - worker approval                                                             │
│ - employer approval                                                           │
│ - credential approval                                                         │
│ - identity verification                                                       │
│ - shift eligibility                                                           │
│ - employment                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AFTER SIGN-IN: ACCOUNT STATE ROUTING                                         │
│                                                                              │
│ Authenticated                                                                │
│      ↓                                                                       │
│ Check account state                                                          │
│      ↓                                                                       │
│ Route to the next allowed step                                                │
│                                                                              │
│ Possible user-facing routes:                                                  │
│                                                                              │
│ Email not verified      → Verify email or resend verification                 │
│ Profile incomplete      → Complete required profile sections                  │
│ Account pending review  → Wait for review or contact support                  │
│ Active                  → Continue to permitted dashboard or workspace        │
│ Restricted              → Review message and contact support if needed        │
│ Suspended               → Contact support or follow provided review path      │
│ Closed                  → Account is closed; use support or create new path   │
│ Password reset required → Reset password before continuing                    │
│                                                                              │
│ Routing never exposes hidden security details or protected account data.      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ACCOUNT STATE MESSAGES                                                       │
│                                                                              │
│ Email not verified                                                            │
│ What happened: Your account email still needs confirmation.                   │
│ What you can do: Resend the verification email or contact support.            │
│                                                                              │
│ Account pending review                                                        │
│ What happened: Your account can sign in, but a review step is still pending.  │
│ What you can do: Check required next steps or contact support.                │
│                                                                              │
│ Account restricted                                                            │
│ What happened: Some account actions are temporarily limited.                  │
│ What you can do: Review the message shown and contact support if needed.      │
│                                                                              │
│ Account suspended                                                             │
│ What happened: The account cannot continue from this screen.                  │
│ What you can do: Contact support or follow the review path shown.             │
│                                                                              │
│ Account closed                                                                │
│ What happened: This account is closed.                                        │
│ What you can do: Contact support if this seems incorrect.                     │
│                                                                              │
│ Invalid credentials                                                           │
│ What happened: We could not sign you in with the information provided.        │
│ What you can do: Check your email/password or use Forgot password.            │
│                                                                              │
│ Too many failed attempts                                                      │
│ What happened: Sign-in is temporarily limited for safety.                     │
│ What you can do: Wait before trying again or use account recovery.            │
│                                                                              │
│ Password reset required                                                       │
│ What happened: A password reset is required before continuing.                │
│ What you can do: Start password reset and return after it is complete.        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ SECURITY MESSAGING                   │ ERROR EXPERIENCE                       │
│                                      │                                       │
│ Protect your password.               │ Error messages must not reveal:       │
│ Sign out on shared devices.          │ - whether an email exists             │
│ Never share verification codes.      │ - whether an account exists           │
│ Use support when access is unclear.  │ - whether a worker is approved        │
│                                      │ - whether an employer is approved     │
│ Remember Me affects convenience      │                                       │
│ only. It does not weaken security,   │ Use neutral language and clear next   │
│ bypass 2FA, or bypass future checks. │ steps.                                │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                  │
│                                                                              │
│ AI may help explain sign-in steps or suggest existing help content.           │
│                                                                              │
│ AI does not authenticate users, reset passwords, approve access, verify       │
│ identity, unlock accounts, bypass security checks, or decide permissions.     │
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
│ Sign in                                      │
│ Account access only.                         │
│ Not approval, eligibility, verification,     │
│ permissions, or employment.                  │
├──────────────────────────────────────────────┤
│ Email                                        │
│ [__________________________________________] │
│ Password                                     │
│ [______________________________] [Show]      │
│ [ ] Remember Me                              │
│     Convenience only. Security checks remain.│
│ [Sign In]                                    │
│ Forgot password?    Create account           │
├──────────────────────────────────────────────┤
│ Account state after sign-in                  │
│ Email pending / Review pending / Active /    │
│ Restricted / Suspended / Closed / Reset req. │
├──────────────────────────────────────────────┤
│ AI helps with guidance only.                 │
└──────────────────────────────────────────────┘
```

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Resident Job          Menu   │
├──────────────────────────────┤
│ Sign in                      │
│ Account access only.         │
│                              │
│ Sign-in does not confirm:    │
│ worker approval, employer    │
│ approval, credentials,       │
│ identity, shift eligibility, │
│ or employment.               │
├──────────────────────────────┤
│ Email                        │
│ [__________________________] │
│ Password                     │
│ [____________________] [Show]│
│                              │
│ [ ] Remember Me              │
│ Convenience only. Does not   │
│ bypass 2FA or future checks. │
│                              │
│ [Sign In]                    │
│ Forgot password?             │
│ Create account               │
├──────────────────────────────┤
│ After sign-in                │
│ Authenticated → account      │
│ state check → next allowed   │
│ step.                        │
├──────────────────────────────┤
│ Account messages             │
│ Email not verified           │
│ Pending review               │
│ Restricted / suspended       │
│ Closed                       │
│ Invalid credentials          │
│ Too many attempts            │
│ Password reset required      │
├──────────────────────────────┤
│ Security                     │
│ Protect password. Sign out   │
│ on shared devices. Never     │
│ share verification codes.    │
├──────────────────────────────┤
│ AI: help only, no access     │
│ decisions.                   │
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

1. Confirm account access.
2. Check account state.
3. Check role and permission context.
4. Route to the next allowed step.

Possible next steps:

- Verify email.
- Complete profile.
- Wait for operational review.
- Continue to permitted dashboard or workspace.
- Review restricted/suspended/closed account message.
- Complete password reset.
- Contact support.

## I. Account State Messaging

Each state must explain what happened and what the user can do next:

| State | What happened | What the user can do next |
| --- | --- | --- |
| Email not verified | Email ownership is not confirmed yet. | Resend verification or contact support. |
| Account pending review | The account exists but a review step is pending. | Review next steps or contact support. |
| Account restricted | Some actions are temporarily limited. | Review the message and contact support if needed. |
| Account suspended | The account cannot continue from this screen. | Contact support or follow the review path shown. |
| Account closed | The account is closed. | Contact support if this seems incorrect. |
| Invalid credentials | The sign-in information could not be accepted. | Try again or use Forgot password. |
| Too many failed attempts | Sign-in is temporarily limited for safety. | Wait, recover the account, or contact support. |
| Password reset required | The password must be reset before continuing. | Start password reset and return after completion. |

## J. Error Experience

Errors must not reveal whether:

- An email exists.
- An account exists.
- A worker is approved.
- An employer is approved.
- Credentials are approved.
- Identity has been verified.
- A user is eligible for shifts.

Use neutral language and next steps.

## K. Remember Me

Remember Me affects convenience only.

It:

- Is optional.
- Is user-controlled.
- Applies to the device context shown to the user.
- Does not weaken authentication.
- Does not bypass future security checks.
- Does not bypass 2FA if enabled.
- Does not bypass high-risk verification.

No cookies, tokens, JWTs, storage behavior, or implementation details are defined in this wireframe.

## L. Security Messaging

Use reassuring but truthful language:

- Protect your password.
- Sign out on shared devices.
- Never share verification codes.
- Use support when access is unclear.
- Security checks may still be required after sign-in.

Do not expose internal security mechanisms.

## M. Accessibility Considerations

- All fields have visible labels.
- Password show/hide has a text label and accessible state.
- Remember Me has descriptive helper text.
- Account-state messages use plain language.
- Error messages are connected to the relevant field or state.
- Focus moves to the first important message after an error.
- No critical meaning relies on color alone.
- Mobile copy remains readable and scannable.

## N. AI Boundary

AI may:

- Explain sign-in steps.
- Suggest FAQ or support content.
- Help users understand visible account-state messages.

AI does not:

- Authenticate users.
- Reset passwords.
- Approve access.
- Verify identity.
- Unlock accounts.
- Bypass 2FA.
- Bypass security checks.
- Decide permissions.

## O. Privacy Reminders

- Sign-in information is used to protect account access and route users to authorized areas.
- Privacy and Terms remain available before sign-in.
- Email verification confirms email ownership only.
- Support may require additional review for account access questions.

## P. Governance Confirmation

- Architecture Freeze v1.0 unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 012 not created.
- No React work started.
- No frontend work started.
- No backend work started.
- No APIs created.
- No database schema created.
- No authentication implementation started.
- No deployment work started.
- No production data used.
