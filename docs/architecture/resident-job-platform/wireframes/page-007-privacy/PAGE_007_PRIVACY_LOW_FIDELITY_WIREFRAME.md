# Page 007 - Privacy Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 007 - Privacy
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_007_PRIVACY.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Content governance reference: `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Policy review reference: `docs/architecture/resident-job-platform/wireframes/POLICY_CONTENT_REVIEW_STANDARD_V1_0.md`
Implementation: Not authorized
Legal publication: Not authorized
Consent-management integration: Not authorized

## A. Purpose

The Privacy page explains how Resident Job approaches privacy, data handling, user controls, and
privacy requests at a product-design level.

It must help users understand what kinds of data may be involved in the platform while making clear
that final legal wording requires legal review before publication.

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

## C. User Goals

Users should be able to:

- Understand the platform's privacy posture.
- Learn why sign-in may be required for account-specific privacy requests.
- See the main categories of data the platform may handle.
- Understand privacy request pathways.
- Understand where AI may assist and where it must not make final decisions.
- Avoid submitting sensitive credentials through public forms.
- Know that legal review is required before publication.

## D. Information Hierarchy

1. Privacy page introduction.
2. Legal-review boundary.
3. Governance metadata.
4. Data categories overview.
5. Why the platform uses data.
6. Role-specific privacy explanations.
7. Location, attendance, and shift-status transparency.
8. Documents and credentials privacy.
9. AI and automated assistance boundaries.
10. User privacy request paths.
11. Security and access controls overview.
12. Data-sharing and integrations placeholder.
13. Retention and deletion placeholder.
14. Sensitive-information warning.
15. Contact/privacy escalation path.

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
│ POLICY GOVERNANCE                                                            │
│ Content Owner: Compliance                                                    │
│ Review Status: Under Review                                                  │
│ Version: Version 1.x                                                         │
│ Last Reviewed: Pending                                                       │
│ Source of Truth: Security Standard / Product Policy / Architecture Reference │
│ Escalation Path: Privacy Request / Compliance Review                         │
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
│ POLICY GOVERNANCE            │
│ Owner: Compliance            │
│ Status: Under Review         │
│ Version: Version 1.x         │
│ Last reviewed: Pending       │
│ Source: Security/Product     │
│ Next: Privacy Request        │
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

## G. Required States

- Default public privacy view.
- Topic selected.
- Signed-in account-specific privacy request path.
- Signed-out privacy request path.
- Privacy request submitted.
- Unavailable account-specific information.
- Sensitive-information warning.
- Content-under-review state.
- Legal-review-required state.
- Offline state.
- Error state.

## H. Accessibility Considerations

- Use semantic headings for policy sections.
- Keep legal-review boundary visible and plain-language.
- Ensure topic navigation is keyboard-accessible.
- Avoid dense legal text blocks in low-fidelity UX.
- Use clear link labels for privacy requests.
- Do not rely on color alone for review status.
- Announce expanded/collapsed policy topics to screen readers.
- Maintain readable mobile answer length.

## I. Security And Privacy Considerations

- Public page must not expose private account, worker, employer, billing, payroll, healthcare,
  support, document, or shift-specific data.
- Account-specific privacy requests require authentication where needed.
- Privacy request references must not expose private data.
- Query and feedback logging must avoid sensitive information.
- Sensitive attachments require a secure future channel.
- Privacy content changes require auditability.
- Legal review is required before publication.

## J. AI Boundaries

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

## K. Self Validation

- Policy Content Review Standard is referenced.
- Content Governance Standard is referenced.
- Legal review required before publication is visible.
- Content owner, review status, version, source of truth, and escalation path are present.
- Product Design, Operational Policy, and Legal Content are separated by boundary language.
- No jurisdiction-specific rights, deadlines, regulators, or legal interpretations are invented.
- Privacy request paths are structured but not legally finalized.
- AI boundaries are explicit.
- Page 008 remains blocked.
- No implementation work has begun.

