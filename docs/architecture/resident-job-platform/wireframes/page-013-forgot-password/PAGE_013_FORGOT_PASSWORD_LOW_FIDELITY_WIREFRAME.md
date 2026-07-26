# Page 013 - Forgot Password Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 013 - Forgot Password
Epic: Epic 2 - Authentication
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_013_FORGOT_PASSWORD.md`
Implementation: Not authorized

## Purpose

The Forgot Password page helps users start a safe password recovery flow without revealing whether an email address or account exists.

This page does not authenticate the user, approve access, verify identity, verify credentials, approve workers, approve employers, or create employment.

## Information Hierarchy

1. Recovery welcome.
2. Email field.
3. Neutral submission action.
4. Confirmation message.
5. Reset-link or reset-code next step notice.
6. Error states.
7. Security messaging.
8. AI boundary.
9. Accessibility and mobile behavior.

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ   Sign In  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ PASSWORD RECOVERY                    │ RESET YOUR PASSWORD                    │
│                                      │                                       │
│ Enter the email used for your        │ Email                                 │
│ Resident Job account.                │ [____________________________________] │
│                                      │                                       │
│ For privacy and security, the        │ [Send Recovery Instructions]           │
│ confirmation message is the same     │                                       │
│ whether or not an account is found.  │ Back to Sign In                        │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONFIRMATION STATE                                                           │
│                                                                              │
│ If an account can use this recovery path, instructions will be sent to the    │
│ email provided.                                                              │
│                                                                              │
│ [Return to Sign In] [Contact Support]                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SECURITY AND EXPECTATION BOUNDARY                                            │
│                                                                              │
│ Password recovery changes account access only. It does not verify identity,  │
│ approve workers, approve employers, approve credentials, grant permissions,  │
│ confirm shift eligibility, or create employment.                             │
│                                                                              │
│ Never share verification or recovery codes.                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ERROR STATES                                                                 │
│                                                                              │
│ Missing email          → Enter your email address.                            │
│ Invalid email format   → Check the email format.                              │
│ Too many requests      → Try again later or contact support.                  │
│ Service unavailable    → Try again later.                                     │
│ Expired reset link     → Request new recovery instructions.                   │
│ Invalid reset link     → Request new recovery instructions.                   │
│                                                                              │
│ Errors must not reveal whether an email or account exists.                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                  │
│ AI may explain recovery steps or suggest support content.                     │
│ AI cannot reset passwords, authenticate users, approve access, unlock         │
│ accounts, verify identity, or bypass security checks.                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Wireframe

```text
┌──────────────────────────────┐
│ Forgot password              │
│ Enter your email.            │
│                              │
│ Email                        │
│ [__________________________] │
│                              │
│ [Send Recovery Instructions] │
│ Back to Sign In              │
├──────────────────────────────┤
│ If an account can use this   │
│ path, instructions will be   │
│ sent.                        │
├──────────────────────────────┤
│ Recovery changes access only.│
│ It is not approval, identity │
│ verification, or employment. │
└──────────────────────────────┘
```

## Accessibility

- Email field has visible label.
- Confirmation message is screen-reader friendly.
- Error messages are plain language.
- Focus moves to confirmation or first error.
- No account existence is revealed through copy.

## Governance Confirmation

- Architecture unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- Page 014 not created by this wireframe.
- No React, frontend, backend, APIs, database, authentication implementation, deployment, or production data.
