# Page 008 - Terms Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 008 - Terms
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_008_TERMS.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Content governance reference: `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Policy review reference: `docs/architecture/resident-job-platform/wireframes/POLICY_CONTENT_REVIEW_STANDARD_V1_0.md`
Legal content governance reference: `docs/architecture/resident-job-platform/wireframes/LEGAL_CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Implementation: Not authorized
Legal publication: Not authorized
Acknowledgement storage: Not authorized

## Revision Scope

Revision 1 is strictly limited to the two documented review conditions:

1. Clarify the acknowledgement decision flow.
2. Clarify the version-change impact block.

No redesign, architecture change, UX Foundation change, navigation change, backend, frontend,
database, acknowledgement storage, legal publication, deployment, or production data work is
introduced.

## Summary Of Changes

Revision 1 adds:

- Acknowledgement Decision Flow.
- What Happens When Terms Change section.
- Version History component.
- Expanded governance metadata showing product, operational, legal, jurisdiction, version, source,
  and escalation status.
- Mobile acknowledgement and version-change flow.

Revision 1 does not add:

- Contractual clauses.
- Limitation-of-liability wording.
- Governing-law clauses.
- Dispute-resolution procedures.
- Legal consequences.
- Mandatory acceptance rules.
- Final legal text.

## A. Purpose

The Terms page defines how users will find, read, acknowledge, revisit, and understand the status of
Resident Job's Terms of Use.

It explains the product experience around Terms without drafting final contractual language.

## B. Primary User

Primary users:

- Guest.
- Worker.
- Employer.
- Residence manager.
- Scheduler.
- Applicant.
- Administrator.
- Legal reviewer.
- Operations reviewer.

## C. User Goals

Users should be able to:

- Read the Terms publicly when no acknowledgement is required.
- Understand when acknowledgement may be requested during account registration.
- Understand that existing-user acknowledgement rules are future operational/legal configuration.
- Understand what may happen when a new Terms version is published.
- View version-history placeholders without fabricated dates or legal approvals.
- Find related policy documents and escalation paths.

## D. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   FAQ   Sign In  │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TERMS OF USE                                                                 │
│                                                                              │
│ Read the rules and responsibilities that will govern use of Resident Job.     │
│                                                                              │
│ Legal-review boundary                                                        │
│ This wireframe defines structure, navigation, acknowledgement flow, version   │
│ display, and governance placeholders only. Final contractual wording requires │
│ legal review before publication.                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ LEGAL CONTENT GOVERNANCE                                                     │
│ Document ID: Terms placeholder                                                │
│ Product Design Status: Product Approved placeholder                          │
│ Operational Status: Operations Review Pending                                │
│ Legal Review Status: Legal Review Required                                   │
│ Jurisdiction Status: Jurisdiction Review Pending                             │
│ Version: Version 1.x                                                         │
│ Effective Date: Pending                                                      │
│ Source of Truth: Legal Content Governance Standard / Architecture Reference   │
│ Escalation Path: Legal Review / Contact Support                              │
│                                                                              │
│ LEGAL REVIEW REQUIRED BEFORE PUBLICATION                                     │
│ OPERATIONAL CONFIGURATION PENDING                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ POLICY CONTENT BOUNDARY                                                      │
│ Product Design: terms page structure, section navigation, acknowledgement UX, │
│ version display, change-history placement, related document links.            │
│                                                                              │
│ Operational Policy: acknowledgement workflow, support routing, notification   │
│ needs, operational change communication, account-context handling.            │
│                                                                              │
│ Legal Content: final terms text, contractual obligations, liability,          │
│ governing law, disputes, warranties, rights, remedies, and legal deadlines.   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬───────────────────────────────────────────────┐
│ TERMS NAVIGATION             │ TERMS CONTENT PLACEHOLDER                     │
│                              │                                               │
│ Overview                     │ Overview                                      │
│ Accounts and eligibility     │                                               │
│ Worker use placeholder       │ This section will contain legally reviewed    │
│ Employer use placeholder     │ terms text before publication.                │
│ Platform role placeholder    │                                               │
│ Shifts and assignments       │ Product note: this wireframe does not define  │
│ Billing and payments         │ final obligations, rights, remedies,          │
│ Documents and verification   │ liability, governing law, or dispute rules.   │
│ AI assistance                │                                               │
│ Communications               │ Related action                                │
│ Privacy and data             │ [View Privacy] [Contact Support]             │
│ Changes to terms             │                                               │
│ Questions                    │ Governance footer                             │
│                              │ Owner: Legal/Product placeholder             │
│                              │ Status: Draft                                 │
│                              │ Version: Version 1.x                          │
│                              │ Source: Legal Content Governance Standard     │
│                              │ Escalation: Legal Review                      │
└──────────────────────────────┴───────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ACKNOWLEDGEMENT DECISION FLOW                                                │
│                                                                              │
│ Public Viewing                                                               │
│ Anyone may read the Terms. No acknowledgement required.                       │
│                                                                              │
│ Account Registration                                                         │
│ User opens registration -> applicable Terms are displayed -> acknowledgement │
│ is requested before account creation is completed -> acknowledgement workflow │
│ is configurable.                                                             │
│ Acknowledgement is requested before account creation is completed.            │
│                                                                              │
│ Existing Users                                                               │
│ User continues under the currently applicable Terms until notified of a new   │
│ version according to future operational and legal rules. Those rules are not  │
│ defined here.                                                                │
│                                                                              │
│ Updated Terms                                                                │
│ New version published -> user may be asked to review and acknowledge it ->    │
│ trigger, timing, and consequences are operational/legal configuration.        │
│                                                                              │
│ Decision flow                                                                │
│ User opens Terms                                                             │
│ -> Current version displayed                                                 │
│ -> System determines whether acknowledgement is required                      │
│ -> User reviews relevant sections                                            │
│ -> User acknowledges where required                                          │
│ -> Acknowledgement status recorded in future implementation                  │
│ -> User may continue or is directed to review changes                        │
│                                                                              │
│ Acknowledgement storage is not implemented in this wireframe.                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHAT HAPPENS WHEN TERMS CHANGE?                                               │
│                                                                              │
│ Product experience placeholders only:                                         │
│ - New version published                                                      │
│ - Previous version archived                                                  │
│ - Summary of changes placeholder                                             │
│ - Effective-date placeholder                                                 │
│ - Notification placeholder                                                   │
│ - Review required where applicable                                           │
│ - Acknowledgement requested where applicable                                 │
│ - Access continues or changes according to approved operational/legal rules   │
│                                                                              │
│ This section does not define legal consequences, contractual effects, or      │
│ mandatory acceptance rules.                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ VERSION HISTORY COMPONENT                                                     │
│                                                                              │
│ Version | Status | Publication placeholder | Effective-date placeholder       │
│ Summary of changes | Legal review status                                      │
│                                                                              │
│ v1.x | Draft / Under Review | Pending | Pending | Placeholder | Required      │
│ v0.x | Superseded placeholder | Pending | Pending | Placeholder | Placeholder │
│                                                                              │
│ Do not fabricate dates, version history, legal review, or user impact.        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ RELATED DOCUMENTS AND QUESTIONS                                               │
│                                                                              │
│ [Privacy] [FAQ] [Contact] [AI Transparency placeholder] [Accessibility        │
│ placeholder] [Cookie Notice placeholder]                                      │
│                                                                              │
│ Questions about the Terms should route to Contact Support or Legal Review     │
│ placeholders. Do not imply automatic resolution or legal advice.              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## E. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TERMS OF USE                 │
│ Structure and review flow.   │
│ Final legal wording requires │
│ legal review before publish. │
└──────────────────────────────┘

┌──────────────────────────────┐
│ DOCUMENT STATUS              │
│ Product: Approved placeholder│
│ Operations: Pending          │
│ Legal: Required              │
│ Jurisdiction: Pending        │
│ Version: Version 1.x         │
│ Effective date: Pending      │
│ LEGAL REVIEW REQUIRED        │
│ OPERATIONAL CONFIG PENDING   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ACKNOWLEDGEMENT FLOW         │
│ Public: read only            │
│ Registration: review and     │
│ acknowledge before account   │
│ completion where configured  │
│ Existing users: future rules │
│ Updated Terms: review may be │
│ requested where configured   │
│ [Review current version]     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHEN TERMS CHANGE            │
│ New version published        │
│ Previous version archived    │
│ Summary placeholder          │
│ Effective-date placeholder   │
│ Notification placeholder     │
│ Review/ack placeholder       │
│ No legal consequences defined│
└──────────────────────────────┘

┌──────────────────────────────┐
│ VERSION HISTORY              │
│ Version                      │
│ Status                       │
│ Publication placeholder      │
│ Effective-date placeholder   │
│ Summary of changes           │
│ Legal review status          │
└──────────────────────────────┘
```

## F. Required States

- Default public Terms view.
- Public read-only view.
- Registration acknowledgement requested.
- Existing-user current-terms view.
- Updated Terms review requested.
- Acknowledgement not required.
- Acknowledgement required.
- Acknowledgement completed placeholder.
- New version requires acknowledgement.
- Change-history view.
- Version-change impact view.
- Superseded version placeholder.
- Archived version placeholder.
- Signed-in user context.
- Signed-out user context.
- Offline state.
- Error state.

## G. AI Boundaries

AI may:

- Summarize legally approved Terms content.
- Suggest missing sections for human review.
- Flag inconsistent placeholders.
- Help users find the relevant approved section.
- Assist with change-impact checklists.

AI must not:

- Draft final contractual language for publication.
- Invent limitation-of-liability wording.
- Invent governing-law clauses.
- Invent dispute-resolution procedures.
- Interpret statutory rights.
- Publish legal content.
- Approve legal changes.
- Remove required metadata.

## H. Self Validation

- Acknowledgement flow is clear.
- Public viewing, registration, existing-user, and updated-Terms states are distinguished.
- Version-change behavior is understandable.
- Version History component includes required fields.
- Governance metadata is complete.
- No contractual language was finalized.
- No governing-law clauses were added.
- No dispute-resolution clauses were added.
- No legal publication occurred.
- Architecture Freeze v1.0 is unchanged.
- UX Foundation is unchanged.
- Navigation is unchanged.
- Page 009 remains blocked until approval.
- No implementation work began.
