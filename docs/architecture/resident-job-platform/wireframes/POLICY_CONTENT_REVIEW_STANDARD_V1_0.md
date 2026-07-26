# Policy Content Review Standard v1.0

Status: Active governance standard
Project: Resident Job
Applies to: Privacy, Terms of Use, Cookies, Security, Compliance, Accessibility, AI Transparency,
Data Governance, and future legal notices
Implementation: Not authorized
Legal publication: Not authorized

## Purpose

This standard defines the review gate for every policy-oriented page.

Policy-oriented pages carry governance and regulatory risk. They may explain product structure,
operational flows, privacy controls, security mechanisms, and user request paths, but they must not
finalize legal commitments without legal review.

## Mandatory Scope

This standard is mandatory for:

- Page 007 - Privacy.
- Page 008 - Terms.
- Page 009 - Become A Worker, where it references worker obligations or onboarding policies.
- Page 010 - Request Staff, where it references employer obligations or staffing terms.
- Cookies.
- Security.
- Compliance.
- Accessibility.
- AI Transparency.
- Data Governance.
- Future legal notices.

## Required Distinction

Every policy-oriented page must distinguish:

1. Product Design.
2. Operational Policy.
3. Legal Content.

## Product Team MAY Define

The Product Team may define:

- Page structure.
- Workflows.
- Transparency patterns.
- Navigation.
- User experience.
- Request flows.
- Governance metadata.
- AI transparency.
- Security mechanisms.
- Privacy controls.
- Data-minimization patterns.
- Consent and acknowledgement UX.
- Escalation paths.

## Product Team MUST NOT Finalize

The Product Team must not finalize:

- Legal wording.
- Contractual obligations.
- Statutory rights.
- Jurisdiction-specific obligations.
- Regulator references.
- Legal deadlines.
- Legal interpretations.
- Legal compliance statements.
- Legal remedies.
- Final privacy-policy text.
- Final terms-of-use text.

## Required Page Metadata

Every policy-oriented page must clearly indicate:

- Legal review required before publication.
- Content owner.
- Review status.
- Version.
- Source of truth.
- Escalation path.

Use the Content Governance Standard for controlled metadata:

- `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`

## Required Legal Review Boundary

Every policy-oriented wireframe must include a visible boundary similar to:

```text
Policy structure and user experience only.
Final legal wording requires legal review before publication.
```

Do not imply that wireframe copy is final legal policy.

## AI Rules For Policy Pages

AI may:

- Summarize approved policy content.
- Suggest missing policy sections for human review.
- Identify inconsistencies.
- Flag outdated placeholders.
- Route users to approved request paths.

AI must not:

- Generate final legal wording.
- Interpret statutory rights.
- Create jurisdiction-specific compliance claims.
- Publish policy content automatically.
- Remove governance metadata.
- Promise legal outcomes.

## Review Checklist

Every policy-oriented page must be reviewed for:

- Product structure clarity.
- Request workflow clarity.
- Legal-review boundary.
- Content owner.
- Review status.
- Version placeholder.
- Source of truth.
- Escalation path.
- Data-minimization posture.
- Security/privacy mechanism clarity.
- AI transparency.
- International readiness.
- Avoidance of unsupported legal, regulatory, employment, payroll, healthcare, tax, or contractual
  claims.

## Approval Boundary

Approved wireframe status means:

- The product structure and UX are approved.
- The governance metadata is approved.
- The legal-review boundary is approved.

Approved wireframe status does not mean:

- The final legal text is approved.
- The page is ready for publication.
- The company has accepted final contractual or statutory obligations.

## Implementation Boundary

This document defines governance only.

It does not authorize:

- Legal publication.
- Frontend implementation.
- Backend implementation.
- Policy CMS implementation.
- Data processing integration.
- Consent-management integration.
- AI policy publishing.
- Production data.
- Deployment.
