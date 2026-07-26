# Page 008 - Terms Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
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
Acknowledgement storage is not implemented in this wireframe.

## A. Purpose

The Terms page defines how users will find, read, acknowledge, revisit, and understand the status of
Resident Job's Terms of Use.

It does not draft final contractual language.

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

- Find the Terms from public navigation.
- Understand that final legal wording requires legal review before publication.
- See the current version placeholder and document status.
- Navigate sections without reading a dense wall of text.
- Understand whether acknowledgement is required.
- View change-history placeholders.
- Find related policy documents.
- Know where to go with questions.

## D. Prohibited Content

Do not invent:

- Contractual clauses.
- Limitation-of-liability wording.
- Governing-law clauses.
- Dispute-resolution procedures.
- Warranty wording.
- Indemnity wording.
- Termination rights.
- Statutory rights.
- Jurisdiction-specific obligations.
- Enforceable legal language.

## E. Information Hierarchy

1. Terms introduction.
2. Legal-review boundary.
3. Legal governance metadata.
4. Policy Content Boundary.
5. Version and status display.
6. Section navigation.
7. Legal placeholder sections.
8. Acknowledgement workflow placeholder.
9. Change-history placeholder.
10. Related documents.
11. Questions and escalation path.
12. Accessibility and download/print placeholders.

## F. Desktop Wireframe

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
│ Status: Draft / Product Approved / Operations Reviewed / Legal Approved       │
│ Version: Version 1.x                                                         │
│ Effective Date: Pending                                                      │
│ Jurisdiction Scope: Pending legal review                                     │
│ Content Owner: Product / Compliance placeholder                              │
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

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ ACKNOWLEDGEMENT WORKFLOW             │ CHANGE HISTORY                         │
│                                      │                                       │
│ Placeholder states:                  │ Version history placeholder            │
│ - No acknowledgement required        │                                       │
│ - Acknowledgement required           │ v1.x - Pending legal review            │
│ - User has acknowledged              │ Superseded version placeholder          │
│ - New version requires review        │ Archived version placeholder            │
│ - Cannot continue until review       │                                       │
│                                      │ Do not fabricate dates or legal         │
│ [Review Terms] [Acknowledge]         │ approval history.                       │
│                                      │                                       │
│ Acknowledgement storage is not       │ [Download placeholder] [Print]          │
│ implemented in this wireframe.       │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

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

## G. Mobile Wireframe

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
│ Status: Draft / Review       │
│ Version: Version 1.x         │
│ Effective date: Pending      │
│ Jurisdiction: Pending        │
│ LEGAL REVIEW REQUIRED        │
│ OPERATIONAL CONFIG PENDING   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ POLICY CONTENT BOUNDARY      │
│ Product Design: page UX      │
│ Operational Policy: workflow │
│ Legal Content: legal review  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SECTIONS                     │
│ Overview                     │
│ Accounts / eligibility       │
│ Worker use                   │
│ Employer use                 │
│ Platform role                │
│ Shifts / assignments         │
│ Billing / payments           │
│ Documents / verification     │
│ AI assistance                │
│ Communications               │
│ Privacy / data               │
│ Changes to terms             │
│ Questions                    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SECTION PLACEHOLDER          │
│ Legally reviewed terms text  │
│ will appear here before      │
│ publication.                 │
│ [View Privacy] [Contact]     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ACKNOWLEDGEMENT              │
│ No acknowledgement required  │
│ Acknowledgement required     │
│ User has acknowledged        │
│ New version requires review  │
│ [Acknowledge placeholder]    │
└──────────────────────────────┘
```

## H. Required States

- Default public Terms view.
- Section selected.
- Legal-review-required state.
- Operational-configuration-pending state.
- Acknowledgement not required.
- Acknowledgement required.
- Acknowledgement completed placeholder.
- New version requires acknowledgement.
- Change-history view.
- Superseded version placeholder.
- Archived version placeholder.
- Signed-in user context.
- Signed-out user context.
- Offline state.
- Error state.

## I. Accessibility Considerations

- Semantic headings for legal sections.
- Keyboard-accessible section navigation.
- Clear legal-review boundary.
- Screen-reader-friendly document status.
- Clear acknowledgement button purpose.
- No dense legal wall of text in wireframe.
- Download and print controls must have accessible labels.
- Change-history entries must not rely on color alone.

## J. AI Boundaries

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

## K. Self Validation

- Legal Content Governance Standard is referenced.
- Policy Content Review Standard is referenced.
- Content Governance Standard is referenced.
- Terms page focuses on structure, navigation, acknowledgement flow, version display, change history,
  document references, and legal-review placeholders.
- No contractual clauses are invented.
- No limitation-of-liability wording is invented.
- No governing-law clause is invented.
- No dispute-resolution procedure is invented.
- No enforceable legal language is invented.
- Legal review required before publication is visible.
- Operational configuration pending is visible.
- Page 009 remains blocked.
- No implementation work has begun.
