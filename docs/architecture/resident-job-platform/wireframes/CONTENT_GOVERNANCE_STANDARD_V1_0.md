# Content Governance Standard v1.0

Status: Active governance standard
Project: Resident Job
Applies to: FAQ, Help Center, Policies, Privacy, Terms, Compliance Documents, AI Guidance,
Support Articles, User Onboarding, Training Materials
Implementation: Not authorized
Knowledge-base implementation: Not authorized

## Purpose

This standard ensures user-facing content is controlled, reviewable, traceable, and safe to publish.

Resident Job content must not present unapproved legal, clinical, tax, payroll, healthcare,
employment, financial, compliance, or operational guidance as universal fact.

## Content Lifecycle

Use these controlled lifecycle states:

1. Draft.
2. Under Review.
3. Approved.
4. Published.
5. Archived.

FAQ answer review status uses the user-facing subset:

- Draft.
- Under Review.
- Approved.
- Archived.

Do not invent custom status labels.

## Required Metadata

Every controlled content item must include:

- Content Owner.
- Review Status.
- Version.
- Last Reviewed.
- Applicability.
- Source of Truth.
- Escalation Path.

## Content Owner

The business function responsible for maintaining the content.

Allowed examples:

- Product.
- Operations.
- Finance.
- Support.
- Compliance.
- Security.

Do not use personal names.

## Review Status

Controlled values:

- Draft.
- Under Review.
- Approved.
- Archived.

## Version

Use placeholders until a real version history exists.

Example:

```text
Version 1.x
```

Do not fabricate version history.

## Last Reviewed

Use placeholders until actual review dates are approved.

Example:

```text
Last reviewed: Pending
```

Do not invent dates.

## Applicability

Every content item must state where it applies.

Allowed examples:

- General.
- Workers.
- Employers.
- Residence Managers.
- Authenticated Users.
- Country-specific, when future localization exists.

Do not hardcode jurisdiction-specific rules without legal, compliance, and localization approval.

## Source Of Truth

Each content item must reference its governing source type.

Allowed examples:

- Approved Business Rule.
- Product Policy.
- Financial UX Standard.
- Security Standard.
- Operations Standard.
- Architecture Reference.

Do not reference unpublished documents.

## Escalation Path

If content is insufficient, unclear, or not applicable to the user's situation, provide the next
safe path.

Allowed examples:

- Contact Support.
- Active-Shift Support.
- Billing Support.
- Privacy Request.
- Compliance Review.

Do not imply automatic resolution.

## AI Content Rules

AI may:

- Recommend an existing approved FAQ.
- Identify stale content.
- Suggest an answer for human review.
- Summarize approved content.
- Detect missing content areas.

AI must never:

- Publish FAQ content automatically.
- Overwrite approved content.
- Remove governance metadata.
- Invent policy.
- Provide unapproved legal, tax, clinical, payroll, healthcare, employment, or financial guidance.

## Publication Guardrails

Do not publish content that:

- Has no owner.
- Has no review status.
- Has no applicability scope.
- Has no approved source type.
- Has no escalation path.
- Includes invented dates, metrics, customer proof, operating locations, response times, or
  availability claims.
- Contradicts the Financial UX Standard, AI Interaction Standards, privacy/security posture, or
  Architecture Freeze v1.0.

## Implementation Boundary

This document defines governance only.

It does not authorize:

- Knowledge-base implementation.
- Search engine implementation.
- Content management system implementation.
- Publishing workflow automation.
- AI publishing.
- Production data.
- Deployment.

