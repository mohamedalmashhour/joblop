# Page 014 - Verify Email Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 014 - Verify Email
Epic: Epic 2 - Authentication
Implementation: Not authorized

## Purpose

The Verify Email page confirms email ownership only.

It does not verify identity, verify credentials, approve workers, approve employers, confirm shift eligibility, grant permissions, complete onboarding, or create employment.

## Information Hierarchy

1. Verification purpose.
2. Code or link confirmation area.
3. Resend verification.
4. Change email/support path.
5. Success state.
6. Expired/invalid state.
7. Security and AI boundaries.

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ VERIFY EMAIL                                                                 │
│                                                                              │
│ Confirm access to your email address before continuing.                      │
│                                                                              │
│ Verification code                                                            │
│ [______] [______] [______] [______] [______] [______]                       │
│                                                                              │
│ [Verify Email]                                                               │
│ Resend verification    Change email or contact support                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ VERIFICATION BOUNDARY                                                        │
│                                                                              │
│ Email verification confirms email ownership only.                            │
│                                                                              │
│ It does not confirm identity, credentials, worker approval, employer          │
│ approval, shift eligibility, permissions, onboarding completion, or           │
│ employment.                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STATES                                                                       │
│                                                                              │
│ Success            → Email verified. Continue to the next required step.      │
│ Code expired       → Request a new verification code.                         │
│ Invalid code       → Check the code or request a new one.                     │
│ Too many attempts  → Try again later or contact support.                      │
│ Email changed      → Verify the new email before continuing.                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                  │
│ AI may explain verification steps. AI cannot verify email for the user,       │
│ bypass verification, verify identity, or approve access.                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Wireframe

```text
┌──────────────────────────────┐
│ Verify email                 │
│ Enter the code sent to email.│
│                              │
│ [_] [_] [_] [_] [_] [_]      │
│ [Verify Email]               │
│ Resend code                  │
├──────────────────────────────┤
│ Email verification confirms  │
│ email ownership only.        │
│ It is not identity,          │
│ credential, worker, employer,│
│ or employment approval.      │
└──────────────────────────────┘
```

## Accessibility

- Code fields have accessible labels.
- Paste behavior should be considered in future implementation.
- Error and success states are announced clearly.
- Resend and support paths are reachable by keyboard.

## Governance Confirmation

- Architecture unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- Page 015 not created by this wireframe.
- No implementation, backend, APIs, database, authentication integration, deployment, or production data.
