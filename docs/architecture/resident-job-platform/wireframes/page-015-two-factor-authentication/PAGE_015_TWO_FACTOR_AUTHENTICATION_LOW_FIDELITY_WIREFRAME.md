# Page 015 - Two-Factor Authentication Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 015 - Two-Factor Authentication
Epic: Epic 2 - Authentication
Implementation: Not authorized

## Purpose

The Two-Factor Authentication page provides a stronger account-access checkpoint where policy or future configuration requires it.

2FA supports account security. It does not verify identity, verify credentials, approve workers, approve employers, grant permissions, confirm shift eligibility, complete onboarding, or create employment.

## Information Hierarchy

1. 2FA purpose.
2. Code entry.
3. Remember/trust-device guidance where allowed.
4. Recovery/help path.
5. Error states.
6. Security boundary.
7. AI boundary.

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ TWO-FACTOR AUTHENTICATION                                                    │
│                                                                              │
│ Enter the verification code required for this sign-in.                       │
│                                                                              │
│ Code                                                                         │
│ [______] [______] [______] [______] [______] [______]                       │
│                                                                              │
│ [Verify]                                                                     │
│ Use another method    Recovery help                                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SECURITY BOUNDARY                                                            │
│                                                                              │
│ Two-factor authentication strengthens account access.                        │
│                                                                              │
│ It does not approve identity, credentials, workers, employers, permissions,  │
│ shift eligibility, onboarding, or employment.                                │
│                                                                              │
│ Never share verification codes.                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STATES                                                                       │
│                                                                              │
│ Success              → Continue to account-state routing.                    │
│ Invalid code         → Check the code or request another method.             │
│ Expired code         → Request a new code.                                   │
│ Too many attempts    → Try later or use recovery help.                       │
│ Device unavailable   → Use recovery help.                                    │
│ Recovery needed      → Human or governed support path where applicable.      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                  │
│ AI may explain 2FA steps or suggest help content. AI cannot generate, view,   │
│ validate, bypass, or recover 2FA codes and cannot approve account access.    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Wireframe

```text
┌──────────────────────────────┐
│ Two-factor authentication    │
│ Enter the required code.     │
│                              │
│ [_] [_] [_] [_] [_] [_]      │
│ [Verify]                     │
│ Use another method           │
│ Recovery help                │
├──────────────────────────────┤
│ 2FA protects access only.    │
│ It is not identity, worker,  │
│ employer, credential, shift, │
│ or employment approval.      │
├──────────────────────────────┤
│ Never share verification     │
│ codes.                       │
└──────────────────────────────┘
```

## Accessibility

- Code entry has clear labels.
- Support path is available without hidden gestures.
- Error/success states are announced clearly.
- Mobile controls use large touch targets.
- No security meaning relies on color alone.

## Governance Confirmation

- Architecture unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- No Worker Portal page created.
- No implementation, backend, APIs, database, authentication integration, deployment, or production data.
