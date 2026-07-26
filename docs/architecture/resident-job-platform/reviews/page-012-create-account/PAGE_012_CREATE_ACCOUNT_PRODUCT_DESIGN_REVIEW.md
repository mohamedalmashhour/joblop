# Page 012 - Create Account Product Design Review

Status: Product Design Review complete - awaiting owner decision
Page: 012 - Create Account
Wireframe reviewed: `docs/architecture/resident-job-platform/wireframes/page-012-create-account/PAGE_012_CREATE_ACCOUNT_LOW_FIDELITY_WIREFRAME.md`
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_012_CREATE_ACCOUNT.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Authentication planning reference: `docs/architecture/resident-job-platform/wireframes/EPIC_002_AUTHENTICATION_PLANNING.md`
Implementation: Not authorized
Production data: Not used

## Executive Summary

Page 012 creates a clear account-creation experience for Worker and Employer users while preserving the approved authentication boundaries.

The wireframe correctly communicates that account creation is only the first step and does not verify identity, verify credentials, approve workers, approve employers, approve employment, or complete onboarding.

Recommended outcome:

```text
APPROVED WITH CONDITIONS
```

The page is strong, but one narrow condition should be resolved before approval: make account-type consequences more visible immediately after choosing Worker or Employer, so users understand the different next-step paths before submitting the form.

## Product Review Categories Evaluated

- usability
- accessibility
- expectation management
- consent clarity
- account-type clarity
- security messaging
- international readiness
- mobile-first experience

## Usability

Score: 9.4

Strengths:

- The form sequence is clear.
- Account type is chosen before data entry.
- Existing users have a sign-in path.
- Confirmation state is simple.

Risk:

- Worker and Employer users may benefit from a stronger account-type preview before form submission.

## Accessibility

Score: 9.5

Strengths:

- Visible labels.
- Accessible show/hide password controls.
- Text-based password guidance.
- Consent checkboxes include clear labels.
- Errors connect to fields and focus behavior is defined.

Risk:

- Future high-fidelity design must keep account type cards keyboard-accessible.

## Expectation Management

Score: 9.7

Passed.

The page clearly states:

- Account creation does not verify identity.
- Account creation does not verify credentials.
- Account creation does not approve workers.
- Account creation does not approve employers.
- Account creation does not approve employment.
- Account creation does not complete onboarding.

## Consent Clarity

Score: 9.4

Passed.

Terms and Privacy acknowledgements are separate and close to the Create Account action.

The page avoids final legal wording and references governed policy pages instead.

## Account-Type Clarity

Score: 9.2

Mostly passed.

The Worker and Employer paths are present and correctly separated, but the consequences of choosing each account type should be more prominent in the main form area before approval.

## Security Messaging

Score: 9.5

Passed.

The page uses practical security guidance:

- Use your own email address.
- Create a password you do not share.
- Protect your password.
- Never share verification codes.
- Review Terms and Privacy before creating the account.

It does not define password hashing, tokens, sessions, OAuth, cookies, provider behavior, or database schema.

## International Readiness

Score: 9.6

Passed.

The page avoids:

- country-specific legal language.
- hardcoded identity documents.
- employment-law assumptions.
- jurisdiction-specific credential promises.
- final legal wording.

## Mobile-First Experience

Score: 9.5

Passed.

The mobile flow places account type first, keeps the form grouped, places acknowledgements near the submit action, and explains email verification before and after account creation.

## AI Boundaries

Score: 10.0

Passed.

AI may explain account creation steps or suggest approved help content.

AI does not create accounts for users, verify identity, verify credentials, approve workers, approve employers, approve employment, complete onboarding, grant permissions, or bypass email verification.

## Scorecard

| Category | Score |
| --- | ---: |
| Usability | 9.4 |
| Accessibility | 9.5 |
| Expectation management | 9.7 |
| Consent clarity | 9.4 |
| Account-type clarity | 9.2 |
| Security messaging | 9.5 |
| International readiness | 9.6 |
| Mobile-first experience | 9.5 |
| AI boundaries | 10.0 |
| Overall Score | 9.5 |

## Strengths

- Strong separation between account creation and approval.
- Clear account journey from creation through activation.
- Worker and Employer pathways are not mixed.
- Email verification is correctly described as email ownership only.
- Security messaging is practical and non-technical.
- No implementation details leak into the wireframe.

## Weaknesses

- Account-type consequences should be stronger at the moment of selection.
- Future visual design must keep policy acknowledgements readable without overwhelming the form.
- Error copy must remain neutral in implementation to avoid account enumeration.

## Risks

- Users may think choosing Worker or Employer automatically grants access to worker or employer tools.
- Employer users may assume they can immediately request staff after account creation.
- Worker users may assume account creation means they can immediately apply for shifts.

## Required Condition Before Approval

Strengthen the Choose Account Type section with a visible "What happens next" preview for each account type:

Worker:

- Verify email.
- Complete profile.
- Add availability.
- Complete credential/document workflow where applicable.
- Wait for operational review where applicable.
- Activation does not guarantee shifts.

Employer:

- Verify email.
- Complete organization information.
- Confirm authorized contact details.
- Complete operational or commercial review where applicable.
- Activation does not guarantee worker availability.

Do not add implementation details, legal promises, worker guarantees, employer guarantees, or approval guarantees.

## Confirmation

- Architecture Freeze v1.0 unchanged.
- Epic 2 Planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 013 not created.
- No approval record created.
- No authentication implementation started.
- No React work started.
- No frontend work started.
- No backend work started.
- No APIs created.
- No database models created.
- No deployment work started.
- No production data used.

## Review Outcome

```text
APPROVED WITH CONDITIONS
```

Page 012 should not be approved as Wireframe v1.0 until the account-type consequence condition is resolved through a controlled Revision 1.
