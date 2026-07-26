# Page 006 - FAQ Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 006 - FAQ
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_006_FAQ.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Financial UX reference: `docs/architecture/resident-job-platform/wireframes/FINANCIAL_UX_STANDARD_V1_0.md`
Content governance reference: `docs/architecture/resident-job-platform/wireframes/CONTENT_GOVERNANCE_STANDARD_V1_0.md`
Implementation: Not authorized
Search engine: Not authorized
Knowledge-base implementation: Not authorized

## Revision Scope

Revision 1 is strictly limited to making answer-level content governance explicit.

No redesign, architecture change, UX Foundation change, navigation change, search engine,
knowledge-base implementation, backend, database, deployment, or production data work is introduced.

## Summary Of Changes

Revision 1 adds a compact Answer Governance block to the expanded answer template.

Each FAQ answer now visibly includes placeholders for:

- Content Owner.
- Review Status.
- Version.
- Last Reviewed.
- Applicability.
- Source of Truth.
- Escalation Path.

The block is intentionally compact so it supports user trust without dominating the answer.

## A. Purpose

The FAQ page helps workers, employers, residence managers, schedulers, applicants, and visitors find
reliable answers quickly while making clear which answers are approved, current, applicable, and
safe to rely on.

It reduces unnecessary support requests by routing people to the right workflow while keeping
general information separate from account-specific, shift-specific, legal, financial, payroll,
healthcare, tax, or employment guidance.

## B. Primary User

Primary users:

- Worker.
- Employer.
- Residence manager.
- Scheduler.
- Applicant.
- Visitor.
- Support reviewer.
- Content reviewer.

## C. User Goals

Users should be able to:

- Search for approved help content.
- Understand whether an answer applies to them.
- See whether an answer is draft, under review, approved, or archived.
- Know which business function owns the answer.
- Know where the answer comes from.
- Know where to go if the answer does not resolve their issue.
- Avoid sharing sensitive information in public FAQ search, feedback, or general support forms.

## D. Information Hierarchy

1. FAQ introduction and scope notice.
2. Prominent FAQ search.
3. User pathway chips.
4. Active-Shift Support action.
5. FAQ category navigation.
6. Search results or selected category.
7. Expandable answer area.
8. Compact Answer Governance block.
9. Related actions and related articles.
10. No-results fallback.
11. Feedback and correction mechanism.
12. Privacy and sensitive-information reminder.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   Sign In        │
│                                      [Request Staff] [Become a Worker]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ HELP CENTER AND FAQ                                                          │
│                                                                              │
│ Find approved answers about Resident Job, worker accounts, staffing requests, │
│ scheduling, billing, documents, privacy, and AI assistance.                   │
│                                                                              │
│ Some answers depend on your country, account, contract, role, or shift.       │
│ Sign in may be required for account-specific help.                            │
│                                                                              │
│ [Search FAQ: "How do I report a late worker?"]                               │
│ Suggested: worker documents | urgent shift | invoice | check-in | AI matching │
│                                                                              │
│ Search support: typo-tolerant or semantic-search placeholder                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ QUICK PATHWAYS                                                               │
│ [Workers] [Employers] [Residence managers] [Applicants] [Billing]            │
│ [Documents] [Account/technical] [Privacy/security]                           │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ HELP WITH AN ACTIVE SHIFT                                                │ │
│ │ Use this path for no-show, late arrival, unable to continue, replacement,│ │
│ │ check-in/out problem, or urgent operational communication issue.          │ │
│ │ [Open Active-Shift Support]                                               │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬───────────────────────────────────────────────┐
│ CATEGORY NAVIGATION          │ EXPANDED ANSWER TEMPLATE                      │
│                              │                                               │
│ Getting Started              │ Category: Shifts and Scheduling               │
│ Worker Accounts              │                                               │
│ Employer and Residence       │ Q: What happens if a worker is late or absent?│
│ Shifts and Scheduling        │                                               │
│ Check-In / Check-Out         │ Summary                                       │
│ Pricing / Billing / Invoices │ Use Active-Shift Support for current shift    │
│ Worker Earnings / Payments   │ issues such as late arrival, no-show, or      │
│ Documents and Compliance     │ replacement support.                          │
│ Safety / Active-Shift        │                                               │
│ Privacy and Security         │ Expandable detail                             │
│ AI and Automated Assistance  │ The platform can help route the issue,        │
│                              │ capture the shift context, and open a support │
│                              │ case. Replacement availability is not         │
│                              │ guaranteed. A person or authorized employer   │
│                              │ confirms final assignment decisions.          │
│                              │                                               │
│                              │ Answer Governance                             │
│                              │ Owner: Support                                │
│                              │ Review Status: Approved                       │
│                              │ Version: Version 1.x                          │
│                              │ Last Reviewed: Pending                        │
│                              │ Applicability: Workers / Employers / General  │
│                              │ Source of Truth: Operations Standard          │
│                              │ Escalation Path: Active-Shift Support         │
│                              │                                               │
│                              │ Related articles                              │
│                              │ - How do I request a replacement?             │
│                              │ - How do I follow an existing case?           │
│                              │                                               │
│                              │ Relevant action                               │
│                              │ [Open Active-Shift Support] [Sign in]         │
│                              │                                               │
│                              │ [Was this helpful? Yes / No]                  │
└──────────────────────────────┴───────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ NO RESULTS STATE                     │ SUPPORT AND SAFETY PANEL              │
│                                      │                                       │
│ No exact match found.                │ Active-shift issue?                    │
│ Try different words or select a      │ [Open Active-Shift Support]            │
│ category.                            │                                       │
│                                      │ Account-specific issue?                 │
│ Suggestions:                         │ [Sign in for secure help]              │
│ - spelling correction placeholder    │                                       │
│ - similar approved articles          │ General question?                       │
│ - category links                     │ [Contact support]                      │
│                                      │                                       │
│ Do not include passwords, full card  │ Medical/public-safety emergency?        │
│ numbers, banking credentials, or     │ Use local emergency services.           │
│ unnecessary health records in        │                                       │
│ searches or support messages.        │ No invented phone numbers, emails,      │
└──────────────────────────────────────┤ hours, response times, or locations.   │
                                       └───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FEEDBACK AND CORRECTION                                                      │
│                                                                              │
│ Report: unclear answer | outdated information | missing topic | wrong route  │
│                                                                              │
│ Feedback may be AI-triaged, but content changes require human review before  │
│ publication. AI cannot publish, overwrite, or remove governance metadata.     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Answer Governance Block

Every FAQ answer includes:

| Field | Controlled Use |
| --- | --- |
| Content Owner | Business function only: Product, Operations, Finance, Support, Compliance, or Security. Do not use personal names. |
| Review Status | Controlled values only: Draft, Under Review, Approved, Archived. |
| Version | Placeholder only, such as `Version 1.x`. Do not fabricate version history. |
| Last Reviewed | Placeholder only, such as `Last reviewed: Pending`. Do not invent dates. |
| Applicability | General, Workers, Employers, Residence Managers, Authenticated Users, or Country-specific when future localization exists. |
| Source of Truth | Approved Business Rule, Product Policy, Financial UX Standard, Security Standard, Operations Standard, or Architecture Reference. Do not reference unpublished documents. |
| Escalation Path | Contact Support, Active-Shift Support, Billing Support, Privacy Request, or Compliance Review. Do not imply automatic resolution. |

## G. Core FAQ Categories

The core categories remain unchanged from the initial wireframe:

- Getting Started.
- Worker Accounts.
- Employer And Residence Accounts.
- Shifts And Scheduling.
- Check-In, Check-Out, And Timesheets.
- Pricing, Billing, And Invoices.
- Worker Earnings And Payments.
- Documents And Compliance.
- Safety And Active-Shift Support.
- Privacy And Security.
- AI And Automated Assistance.

Financial answers continue to follow the Financial UX Standard.

## H. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ HELP CENTER AND FAQ          │
│ Search approved answers.     │
│ Some answers depend on your  │
│ country, account, contract,  │
│ role, or shift.              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SEARCH                       │
│ [How do I...]                │
│ Suggested searches           │
│ worker documents | invoice   │
│ late worker | check-in       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ HELP WITH AN ACTIVE SHIFT    │
│ No-show, late arrival,       │
│ replacement, check-in/out,   │
│ or urgent shift issue.       │
│ [Open Active-Shift Support]  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CATEGORIES                   │
│ Getting Started              │
│ Worker Accounts              │
│ Employer / Residence         │
│ Shifts / Scheduling          │
│ Check-In / Timesheets        │
│ Pricing / Billing            │
│ Worker Earnings              │
│ Documents / Compliance       │
│ Safety / Active-Shift        │
│ Privacy / Security           │
│ AI Assistance                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EXPANDED ANSWER              │
│ Summary                      │
│ Expandable detail            │
│                              │
│ Answer Governance            │
│ Owner: Support               │
│ Status: Approved             │
│ Version: Version 1.x         │
│ Last reviewed: Pending       │
│ Applies to: General          │
│ Source: Operations Standard  │
│ Next step: Contact Support   │
│                              │
│ Related articles             │
│ Relevant action              │
│ [Was this helpful?]          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NO RESULTS                   │
│ Try another search.          │
│ Browse categories.           │
│ [Contact support]            │
│ [Active-Shift Support]       │
│ Do not share passwords, full │
│ card, banking credentials,   │
│ or unnecessary health info.  │
└──────────────────────────────┘
```

## I. AI Requirements

AI may:

- Recommend an existing approved FAQ.
- Identify stale content.
- Suggest an answer for human review.
- Interpret search intent.
- Summarize approved content.

AI must never:

- Publish FAQ content automatically.
- Overwrite approved content.
- Remove governance metadata.
- Invent policy.
- Provide unapproved legal, tax, clinical, payroll, healthcare, employment, or financial guidance.

## J. Self Validation

- Answer Governance block is visible in the expanded answer template.
- Content Owner uses business functions, not personal names.
- Review Status uses only Draft, Under Review, Approved, or Archived.
- Version is a placeholder only.
- Last Reviewed is a placeholder only.
- Applicability is explicit and country-neutral.
- Source of Truth uses approved source types and avoids unpublished documents.
- Escalation Path gives safe next steps without promising automatic resolution.
- AI cannot publish, overwrite, remove metadata, or invent policy.
- Architecture Freeze v1.0 is unchanged.
- UX Foundation is unchanged.
- Navigation is unchanged.
- Page 007 remains blocked until approval.
- No implementation work has begun.

