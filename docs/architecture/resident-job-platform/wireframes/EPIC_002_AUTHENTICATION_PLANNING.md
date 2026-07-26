# Epic 2 - Authentication Planning

Product: Resident Job
Epic: Epic 2 - Authentication
Pages in scope: 011-015
Status: APPROVED v1.0 - Page 011 is the next controlled wireframe gate
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## Purpose

Define the approved planning boundary for the Authentication epic before any Page 011 wireframe is created.

This document prepares the Authentication epic for controlled low-fidelity wireframe work only. It does not authorize frontend, backend, database, or authentication implementation.

## Epic Scope

Epic 2 covers the public and account-entry authentication experience for Resident Job.

It includes:

- Sign in.
- Account creation.
- Password recovery.
- Email verification.
- Two-factor authentication planning.

It does not include worker credential verification, employer approval, document validation, profile completion, payroll setup, or operational permissions beyond the authentication entry point.

## Objectives

- Provide a clear, trustworthy authentication journey for workers, employers, and future administrators.
- Separate account authentication from professional or organizational verification.
- Make account states understandable without exposing security-sensitive details.
- Support mobile-first use from the beginning.
- Preserve international readiness and avoid country-specific legal claims.
- Keep AI clearly outside authentication authority.

## Success Criteria

Epic 2 succeeds when Pages 011-015:

- Explain account access and recovery clearly.
- Support workers and employers without mixing their responsibilities.
- Distinguish registration, verification, approval, and access.
- Provide clear loading, error, empty, locked, expired, and success states.
- Avoid revealing whether an email address exists during sensitive flows.
- Maintain accessibility and touch usability on mobile.
- Keep legal, security, and privacy boundaries visible.
- Preserve auditability for important authentication events without exposing secrets.

## Page Sequence

| Page | Name | Purpose |
| --- | --- | --- |
| 011 | Sign In | Allow returning users to access the correct account entry path. |
| 012 | Create Account | Start a new worker or employer account without implying approval. |
| 013 | Forgot Password | Guide users through secure password recovery. |
| 014 | Verify Email | Confirm email ownership and explain next account steps. |
| 015 | Two-Factor Authentication | Define the user experience for stronger account protection. |

Page 011 remains blocked until this planning document is owner-approved.

## Dependencies

Epic 2 depends on:

- Architecture Freeze v1.0.
- UX Foundation.
- Design System.
- Navigation Architecture.
- Permission Matrix.
- Security Architecture.
- Privacy page governance.
- Terms acknowledgement governance.
- Content Governance Standard.
- Legal Content Governance Standard.
- Epic 1 approval record.

## Authentication Boundaries

Authentication proves account access. It does not prove:

- Worker professional eligibility.
- Credential validity.
- Employer legitimacy.
- Residence approval.
- Permission to request or accept shifts.
- Eligibility for payroll or billing actions.

The UX must avoid language that collapses these separate states into a single "approved" status.

## Identity Model

The planning model separates:

- Account identity: the login record used to access Resident Job.
- Person profile: the human user profile connected to the account.
- Worker profile: professional information and availability.
- Employer profile: organization and staffing request context.
- Role membership: the access relationship between an account and a workspace, company, residence, or administrative function.
- Verification status: email, account, worker, credential, employer, and operational review states.

Identity language must make clear that an account can exist before the user is approved to perform platform actions.

## Account Lifecycle

The Authentication epic should make the account lifecycle understandable without implying operational approval.

Recommended account states:

```text
Visitor

Account Created

Email Verification Pending

Email Verified

Profile Incomplete

Profile Complete

Operational Review (where applicable)

Active

Restricted

Suspended

Closed
```

Authentication grants account access only.

It does not:

- Verify identity.
- Verify credentials.
- Approve employment.
- Approve employers.
- Approve workers.
- Confirm shift eligibility.
- Grant operational permissions.

The UX should distinguish account progress from platform eligibility. A user may have a valid account and still require profile completion, operational review, credential review, employer approval, worker approval, or permission assignment before using restricted platform functions.

## Authentication vs Authorization

Authentication answers:

"Who is attempting to access the system?"

Authorization answers:

"What is this authenticated user allowed to do?"

Authentication does not grant permissions.

Permissions are determined separately by:

- Role.
- Account status.
- Verification status.
- Organizational membership.
- Operational rules.

Examples:

- Worker: can sign in after authentication, but shift access depends on profile status, worker approval, availability, credential requirements, and operational rules.
- Employer: can sign in after authentication, but staffing requests depend on organization membership, employer approval, payment or commercial status where applicable, and operational rules.
- Scheduler: can sign in after authentication, but scheduling actions depend on assigned role, organization scope, and permission grants.
- Administrator: can sign in after authentication, but administrative actions depend on role scope, audit requirements, and approved permissions.
- Support: can sign in after authentication, but support actions are limited by support role, privacy boundaries, escalation rules, and audit controls.
- Super Administrator: can sign in after authentication, but elevated actions require stronger governance, logging, and future security controls such as two-factor authentication.

## Session Model

The session experience should communicate:

- Signed-in state.
- Signed-out state.
- Expired session.
- Locked or restricted account state.
- Device/session security notice where appropriate.
- Safe return path after verification, reset, or timeout.

The wireframes should not define technical token storage, session duration, encryption implementation, or infrastructure controls.

## Remember-Me Behavior

Remember-me behavior should be treated as a UX trust and security choice, not as an implementation decision.

Principles:

- Optional.
- Transparent.
- Device-specific.
- Revocable.
- User-controlled.
- Never bypasses authentication security.
- Never bypasses two-factor authentication.
- Never bypasses high-risk verification.
- May be revoked remotely.
- Session expiration remains configurable.

The UX should communicate that remembering a device improves convenience but does not remove required security checks. High-risk actions, role changes, administrative actions, unusual activity, or future policy requirements may still require reauthentication or two-factor confirmation.

This planning document does not define cookies, tokens, storage mechanisms, cryptography, or authentication provider behavior. Those belong to future engineering architecture and implementation review.

## Email Verification Integration

Email verification should:

- Confirm email ownership.
- Use neutral messages that do not leak account existence unnecessarily.
- Provide clear resend, expired-code, invalid-code, and success states.
- Explain that email verification is one step in the account process.
- Avoid implying worker, employer, credential, or staffing approval.

Email verification must not be presented as identity verification or credential verification.

## Password Reset Philosophy

Password reset should be:

- User-guided.
- Privacy-preserving.
- Clear about next steps.
- Resistant to account enumeration in visible messaging.
- Designed for expired, invalid, already-used, and successful reset states.

The UX should not expose security logic, token details, or operational internals.

## Two-Factor Authentication Strategy

Two-factor authentication is planned as a security capability for higher-trust account access.

The wireframes should support:

- Setup prompt.
- Verification code entry.
- Recovery guidance.
- Device loss guidance.
- Administrative or high-risk action prompts where future policy requires.

The wireframes must not hardcode a specific 2FA vendor, jurisdiction-specific rule, or enforcement policy unless later approved.

## Future Identity-Verification Relationship

Authentication and identity verification are related but separate.

Future worker and employer verification flows may include:

- Document review.
- Credential review.
- Background-check workflow where available and applicable.
- Employer onboarding review.
- Residence or organization approval.

Epic 2 should only prepare users for those later steps without designing or implementing them.

## AI Boundaries

AI may:

- Explain account steps.
- Suggest help content.
- Identify stale support guidance for human review.
- Flag suspicious patterns for authorized human review in future systems.

AI must not:

- Sign in as a user.
- Approve an account.
- Verify an email.
- Verify identity.
- Reset passwords.
- Bypass two-factor authentication.
- Reveal whether an account exists.
- Override security or support decisions.
- Publish authentication policy.

## Security Principles

The Authentication epic should express these principles at the UX level:

- Least disclosure in error messages.
- Clear recovery paths.
- No secret exposure.
- No account enumeration.
- Auditability of important account events.
- Human support escalation for unresolved account access issues.
- Separation between user convenience and security approval.
- No production credentials or secrets in documentation or prototypes.

## Security Clarification

The Authentication epic must preserve these separations:

```text
Email verification

does not equal

Identity verification

Identity verification

does not equal

Credential verification

Credential verification

does not equal

Worker approval

Worker approval

does not equal

Shift eligibility

Authentication

does not equal

Employment
```

These workflows remain independent so that the platform can support regulated, multi-role, and multi-jurisdiction operations without treating login as approval.

## Mobile-First Considerations

All authentication pages should be designed for mobile first:

- Large touch targets.
- Short forms.
- Clear progress and status feedback.
- Keyboard-friendly input behavior.
- Readable error states.
- Recovery actions visible without excessive scrolling.
- Safe spacing around primary and secondary actions.

Desktop and tablet layouts should adapt without adding extra complexity.

## Accessibility

Authentication wireframes must consider:

- Clear labels for all fields.
- Visible focus states.
- Screen-reader-friendly status messages.
- Error messages connected to the relevant field.
- Sufficient color contrast.
- No reliance on color alone.
- Plain-language recovery guidance.
- Support for users with low vision, limited mobility, or cognitive load constraints.

## International Readiness

Epic 2 should remain country-neutral.

Wireframes should avoid:

- Country-specific legal language.
- Hardcoded emergency numbers.
- Hardcoded identity document names.
- Jurisdiction-specific employment or privacy claims.
- Language that prevents future localization.

The design should support future LTR/RTL localization and variable text length.

## Risks

Key risks to watch during wireframing:

- Confusing account creation with approval.
- Treating email verification as identity verification.
- Using error messages that reveal whether an account exists.
- Overpromising security controls before implementation.
- Making 2FA feel optional where future policy may require it.
- Mixing worker and employer account journeys.
- Creating authentication screens that are too dense for mobile use.
- Letting AI appear to make security decisions.

## Out-of-Scope Items

The Authentication planning phase does not include:

- React components.
- Frontend implementation.
- Backend implementation.
- Database schema.
- Authentication provider integration.
- Email service integration.
- 2FA vendor selection.
- Production security configuration.
- Worker onboarding implementation.
- Employer onboarding implementation.
- Identity-verification implementation.
- Admin user management implementation.
- Deployment.
- Production data.

## Next Gate

Epic 2 Authentication Planning is approved as v1.0.

Page 011 - Sign In is the next controlled wireframe gate.

Do not create Page 011 until the owner explicitly authorizes the first Authentication wireframe.

If approved, Page 011 must follow the established lifecycle:

1. Initial low-fidelity wireframe.
2. Self validation.
3. Product Design Review.
4. Controlled revision if required.
5. Approval record.
6. Design Status Matrix update.
7. Stop before Page 012 until owner approval.
