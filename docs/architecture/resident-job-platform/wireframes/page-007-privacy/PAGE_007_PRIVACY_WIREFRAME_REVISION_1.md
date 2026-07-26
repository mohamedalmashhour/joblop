# Page 007 - Privacy Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 007 - Privacy
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_007_PRIVACY.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Content governance reference: `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Policy review reference: `docs/architecture/resident-job-platform/wireframes/POLICY_CONTENT_REVIEW_STANDARD_V1_0.md`
Implementation: Not authorized
Legal publication: Not authorized
Operational configuration: Pending
Consent-management integration: Not authorized

## Revision Scope

Revision 1 is strictly limited to making the policy-content boundary explicit.

No redesign, architecture change, UX Foundation change, navigation change, backend, frontend,
database, consent-management integration, legal publication, deployment, or production data work is
introduced.

## Summary Of Changes

Revision 1 adds a compact Policy Content Boundary block that separates:

- Product Design.
- Operational Policy.
- Legal Content.

The block is visible near the top of the page, immediately after the legal-review boundary and
before detailed privacy topics.

## A. Purpose

The Privacy page explains Resident Job's privacy posture at the product-design level while clearly
separating approved UX structure from operational-policy configuration and final legal content.

It helps users understand privacy controls, data categories, request paths, AI boundaries, and
security mechanisms without implying that the wireframe is final legal policy.

## B. Primary User

Primary users:

- Guest.
- Worker.
- Employer.
- Residence manager.
- Scheduler.
- Applicant.
- Administrator.
- Privacy reviewer.
- Compliance reviewer.
- Legal reviewer.

## C. User Goals

Users should be able to:

- Understand the platform's privacy posture.
- See that the page structure is product design, not final legal text.
- Understand which operational policies still require business/compliance configuration.
- Understand that final legal wording requires legal review before publication.
- Learn why sign-in may be required for account-specific privacy requests.
- See the main categories of data the platform may handle.
- Understand privacy request pathways.
- Understand where AI may assist and where it must not make final decisions.
- Avoid submitting sensitive credentials through public forms.

## D. Information Hierarchy

1. Privacy page introduction.
2. Legal-review boundary.
3. Policy Content Boundary.
4. Governance metadata.
5. Data categories overview.
6. Why the platform uses data.
7. Role-specific privacy explanations.
8. Location, attendance, and shift-status transparency.
9. Documents and credentials privacy.
10. AI and automated assistance boundaries.
11. User privacy request paths.
12. Security and access controls overview.
13. Data-sharing and integrations placeholder.
14. Retention and deletion placeholder.
15. Sensitive-information warning.
16. Contact/privacy escalation path.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ   Sign In  │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AT RESIDENT JOB                                                      │
│                                                                              │
│ Learn how the platform is designed to protect worker, employer, residence,    │
│ scheduling, support, billing, document, and operational data.                 │
│                                                                              │
│ Legal-review boundary                                                        │
│ Policy structure and user experience only. Final legal wording requires       │
│ legal review before publication.                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ POLICY CONTENT BOUNDARY                                                      │
│                                                                              │
│ Product Design                                                               │
│ Approved UX structure: page layout, navigation, privacy request paths,        │
│ transparency sections, governance metadata, AI boundaries, and safety notices.│
│                                                                              │
│ Operational Policy                                                           │
│ Requires business/compliance configuration: operational privacy controls,      │
│ support routing, retention placeholders, consent/preferences, and escalation  │
│ handling.                                                                     │
│                                                                              │
│ Legal Content                                                                │
│ Requires legal review before publication: final privacy wording, statutory    │
│ rights, jurisdiction-specific obligations, regulator references, deadlines,   │
│ legal interpretations, and contractual commitments.                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ POLICY GOVERNANCE                                                            │
│ Content Owner: Compliance                                                    │
│ Review Status: Under Review                                                  │
│ Version: Version 1.x                                                         │
│ Last Reviewed: Pending                                                       │
│ Source of Truth: Security Standard / Product Policy / Architecture Reference │
│ Escalation Path: Privacy Request / Compliance Review                         │
│ Status flags: LEGAL REVIEW REQUIRED BEFORE PUBLICATION                       │
│               OPERATIONAL CONFIGURATION PENDING                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬───────────────────────────────────────────────┐
│ PRIVACY TOPICS               │ PRIVACY CONTENT                               │
│                              │                                               │
│ Data we may handle           │ Data we may handle                            │
│ Why data is used             │                                               │
│ Workers                      │ Examples of platform data categories:         │
│ Employers / residences       │ - Account and profile information             │
│ Attendance / shift status    │ - Worker qualifications and documents         │
│ Documents / credentials      │ - Employer and residence information          │
│ AI assistance                │ - Shift, scheduling, and attendance records   │
│ Privacy requests             │ - Support cases and communications            │
│ Security controls            │ - Billing and invoice-related records         │
│ Sharing / integrations       │ - Privacy request records                     │
│ Retention / deletion         │                                               │
│ Contact privacy support      │ Do not include private account details on     │
│                              │ this public page. Account-specific records    │
│                              │ require authentication.                       │
│                              │                                               │
│                              │ [Sign in for account-specific privacy help]   │
└──────────────────────────────┴───────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ ROLE-SPECIFIC PRIVACY                │ OPERATIONAL TRANSPARENCY              │
│                                      │                                       │
│ Workers                              │ Location / attendance / shift status   │
│ - Profile and availability data      │                                       │
│ - Credentials and documents          │ The platform may support authorized    │
│ - Shift and attendance records       │ attendance, location, and status        │
│ - Earnings/payment status context    │ verification where approved and         │
│                                      │ applicable.                            │
│ Employers / residences               │                                       │
│ - Organization and residence records │ Privacy-aware wording required.         │
│ - Staffing requests and schedules    │ Do not claim all methods are available │
│ - Timesheet and billing context      │ in every jurisdiction.                  │
│                                      │                                       │
│ Applicants / visitors                │ [Learn about check-in privacy]          │
│ - Account creation and inquiry data  │ [Contact Privacy Support]              │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ AI AND AUTOMATED ASSISTANCE          │ PRIVACY REQUEST PATHS                  │
│                                      │                                       │
│ AI may help classify support         │ Request types                           │
│ requests, suggest approved FAQ       │ - Access request placeholder            │
│ articles, detect missing fields,     │ - Correction request placeholder        │
│ summarize approved content, and flag │ - Deletion request placeholder          │
│ risk for human review.               │ - Consent/preference request placeholder│
│                                      │ - Security or privacy concern           │
│ AI must not make final privacy,      │                                       │
│ legal, employment, payroll, billing, │ Account-specific requests may require   │
│ or disciplinary decisions.           │ sign-in to protect user data.           │
│                                      │                                       │
│ AI must not expose private records   │ No legal deadlines are stated in this   │
│ without authorization.               │ wireframe. Final legal wording requires │
│                                      │ legal review.                           │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SECURITY AND ACCESS CONTROLS OVERVIEW                                        │
│                                                                              │
│ Product-level mechanisms may include authentication, role-based access,       │
│ permission boundaries, audit logs, secure support channels, sensitive-field   │
│ warnings, and controlled content review.                                      │
│                                                                              │
│ Do not submit passwords, full payment-card numbers, banking credentials,      │
│ unnecessary health records, or unrelated private information through public   │
│ forms.                                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SHARING, INTEGRATIONS, RETENTION, AND DELETION                               │
│                                                                              │
│ Sharing and integration details: placeholder requiring legal and security     │
│ review.                                                                      │
│ Retention and deletion details: placeholder requiring legal review.           │
│ Country-specific rights and deadlines: future localization and legal review.  │
│                                                                              │
│ [Make a privacy request] [Contact support] [View FAQ]                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY AT RESIDENT JOB      │
│ Product privacy overview.    │
│ Final legal wording requires │
│ legal review before publish. │
└──────────────────────────────┘

┌──────────────────────────────┐
│ POLICY CONTENT BOUNDARY      │
│ Product Design: UX structure │
│ Operational Policy: pending  │
│ business/compliance config   │
│ Legal Content: legal review  │
│ required before publication  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ POLICY GOVERNANCE            │
│ Owner: Compliance            │
│ Status: Under Review         │
│ Version: Version 1.x         │
│ Last reviewed: Pending       │
│ Source: Security/Product     │
│ Next: Privacy Request        │
│ LEGAL REVIEW REQUIRED        │
│ OPERATIONAL CONFIG PENDING   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TOPICS                       │
│ Data we may handle           │
│ Why data is used             │
│ Workers                      │
│ Employers / residences       │
│ Attendance / shift status    │
│ Documents / credentials      │
│ AI assistance                │
│ Privacy requests             │
│ Security controls            │
│ Sharing / integrations       │
│ Retention / deletion         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY REQUESTS             │
│ Access placeholder           │
│ Correction placeholder       │
│ Deletion placeholder         │
│ Consent/preference placeholder│
│ Security/privacy concern     │
│ [Make a privacy request]     │
│ Sign-in may be required.     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SENSITIVE INFO WARNING       │
│ Do not send passwords, full  │
│ cards, banking credentials,  │
│ unnecessary health records,  │
│ or unrelated private info.   │
└──────────────────────────────┘
```

## G. Boundary Definitions

Product Design:

- Page structure.
- Navigation.
- Privacy request path.
- Governance metadata.
- AI boundary placement.
- Security and privacy mechanism explanations.
- Sensitive-information warnings.

Operational Policy:

- Business/compliance configuration.
- Support routing.
- Consent and communication preferences.
- Retention placeholders.
- Escalation handling.
- Operational privacy controls.

Legal Content:

- Final privacy wording.
- Statutory rights.
- Jurisdiction-specific obligations.
- Regulator references.
- Legal deadlines.
- Legal interpretations.
- Contractual commitments.

## H. Required States

- Default public privacy view.
- Topic selected.
- Policy boundary visible.
- Signed-in account-specific privacy request path.
- Signed-out privacy request path.
- Privacy request submitted.
- Unavailable account-specific information.
- Sensitive-information warning.
- Content-under-review state.
- Legal-review-required state.
- Operational-configuration-pending state.
- Offline state.
- Error state.

## I. AI Boundaries

AI may:

- Summarize approved privacy content.
- Suggest missing privacy topics for human review.
- Identify inconsistent placeholders.
- Route users to approved privacy request paths.
- Flag risky or sensitive submitted text for human review.

AI must not:

- Generate final legal wording.
- Interpret statutory rights.
- Create jurisdiction-specific compliance claims.
- Publish privacy content automatically.
- Remove governance metadata.
- Promise legal outcomes.
- Access or expose private records without authorization.

## J. Self Validation

- Product Design / Operational Policy / Legal Content boundary is visible.
- Legal review required before publication is visible.
- Operational configuration pending is visible.
- Content owner, review status, version, source of truth, and escalation path remain present.
- Architecture Freeze v1.0 is unchanged.
- UX Foundation is unchanged.
- Navigation is unchanged.
- No jurisdiction-specific rights, deadlines, regulators, or legal interpretations are invented.
- AI boundaries are unchanged and explicit.
- Page 008 remains blocked until approval.
- No implementation work has begun.

