# Page 012 - Create Account Wireframe Revision 1

Status: Revision 1 complete
Page: 012 - Create Account
Epic: Epic 2 - Authentication
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Authentication planning reference: `docs/architecture/resident-job-platform/wireframes/EPIC_002_AUTHENTICATION_PLANNING.md`
Implementation: Not authorized

## Summary Of Revision 1 Changes

Revision 1 strengthens the account-type selection section so Worker and Employer users immediately understand what happens next before submitting the form.

No architecture, UX Foundation, navigation, implementation, API, backend, database, or authentication logic was changed.

## Account Creation Boundary

This page creates an account only.

It does not:

- Verify identity.
- Verify credentials.
- Approve workers.
- Approve employers.
- Approve employment.
- Complete onboarding.
- Grant permissions.
- Guarantee shifts.
- Guarantee staffing access.

## Required Account Journey

```text
Account Creation

Email Verification

Profile Completion

Operational Review (where applicable)

Activation
```

The current page covers only Account Creation.

## Revised Choose Account Type Section

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ CHOOSE ACCOUNT TYPE                                                          │
│                                                                              │
│ ( ) Worker                                                                   │
│     I want to find and manage shifts.                                        │
│                                                                              │
│     What happens next:                                                       │
│     1. Verify email.                                                         │
│     2. Complete worker profile.                                              │
│     3. Add availability.                                                     │
│     4. Complete credential/document workflow where applicable.               │
│     5. Wait for operational review where applicable.                         │
│     6. Activation does not guarantee shifts.                                 │
│                                                                              │
│ ( ) Employer                                                                 │
│     I want to request staffing support.                                      │
│                                                                              │
│     What happens next:                                                       │
│     1. Verify email.                                                         │
│     2. Complete organization information.                                    │
│     3. Confirm authorized contact details.                                   │
│     4. Complete operational or commercial review where applicable.           │
│     5. Access to staffing requests depends on approved status and rules.     │
│     6. Activation does not guarantee worker availability.                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Revision

```text
┌──────────────────────────────┐
│ Account type                 │
│                              │
│ ( ) Worker                   │
│ Next: verify email, profile, │
│ availability, documents when │
│ applicable, review, then     │
│ activation. No shift         │
│ guarantee.                   │
│                              │
│ ( ) Employer                 │
│ Next: verify email, org      │
│ information, authorized      │
│ contact, review, then        │
│ activation. No staffing      │
│ guarantee.                   │
└──────────────────────────────┘
```

## Consent And Policy Acknowledgement

The page keeps Terms and Privacy acknowledgements separate and visible before account creation.

Final legal wording is not included in this wireframe.

## Email Verification Notice

Email verification remains the next step after account creation.

Email verification confirms email ownership only. It does not verify identity, verify credentials, approve workers, approve employers, approve employment, complete onboarding, or grant permissions.

## AI Boundary

AI may explain account creation steps and suggest approved help content.

AI does not create accounts for users, verify identity, verify credentials, approve workers, approve employers, approve employment, complete onboarding, grant permissions, or bypass email verification.

## Governance Confirmation

- Architecture Freeze v1.0 unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 013 not created by this revision.
- No React work started.
- No frontend work started.
- No backend work started.
- No APIs created.
- No database models created.
- No authentication implementation started.
- No deployment work started.
- No production data used.
