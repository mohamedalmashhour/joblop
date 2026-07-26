# Page 006 - FAQ Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 006 - FAQ
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_006_FAQ.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Financial UX reference: `docs/architecture/resident-job-platform/wireframes/FINANCIAL_UX_STANDARD_V1_0.md`
Implementation: Not authorized
Search integration: Not authorized
Knowledge-base integration: Not authorized
Support integration: Not authorized

## A. Purpose

The FAQ page helps workers, employers, residence managers, schedulers, applicants, and visitors find
reliable answers quickly.

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

## C. User Goals

Users should be able to:

- Search for a question in plain language.
- Browse by role or topic.
- Understand when an answer depends on country, account, contract, role, or specific shift.
- Know when sign-in is required for account-specific help.
- Use Active-Shift Support for current or imminent operational shift issues.
- Avoid sharing sensitive information in public FAQ search, feedback, or general support forms.
- Find the correct next action without receiving unsupported legal, clinical, financial, payroll,
  tax, or employment advice.

## D. Information Hierarchy

1. FAQ introduction and scope notice.
2. Prominent FAQ search.
3. User pathway chips.
4. Active-Shift Support action.
5. FAQ category navigation.
6. Search results or selected category.
7. Expandable answer area.
8. Related actions and related articles.
9. No-results fallback.
10. Feedback and correction mechanism.
11. Governance and content-safety metadata.
12. Privacy and sensitive-information reminder.

## E. FAQ Introduction

The introduction explains:

- The FAQ contains general platform information and approved help content.
- Some answers depend on the user's country, account, contract, role, or specific shift.
- Account-specific issues may require sign-in.
- Active-shift issues use the dedicated Active-Shift Support path.
- Medical emergencies, threats to immediate safety, and public-safety emergencies must be directed
  to local emergency services.
- FAQ answers do not replace legal, clinical, tax, payroll, employment, or contract-specific advice.

## F. Desktop Wireframe

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
│ CATEGORY NAVIGATION          │ ANSWER CONTENT                                │
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
│                              │ Related articles                              │
│                              │ - How do I request a replacement?             │
│                              │ - How do I follow an existing case?           │
│                              │                                               │
│                              │ Relevant action                               │
│                              │ [Open Active-Shift Support] [Sign in]         │
│                              │                                               │
│                              │ Metadata                                      │
│                              │ Owner: Support content owner placeholder      │
│                              │ Review status: Approved / under review        │
│                              │ Applicability: General / account-specific     │
│                              │ Version/review placeholder                    │
│                              │ Source: Approved business-rule reference      │
│                              │ Escalation: Contact support if uncertain      │
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
│ publication.                                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## G. Core FAQ Categories

### Getting Started

- What is Resident Job?
- Who can use the platform?
- How do I create an account?
- Do I need an account to browse or contact support?
- Where is Resident Job available?

Guardrail:

- Do not claim active availability in jurisdictions not formally approved.

### Worker Accounts

- How do I complete my profile?
- How do I set availability?
- How do I upload or update documents?
- How does verification work?
- How do I find or accept shifts?
- What happens if I cannot attend a shift?

### Employer And Residence Accounts

- How do I request staff?
- How do I create an urgent shift?
- How are workers suggested?
- Who makes the final assignment decision?
- How do I manage locations and departments?
- How do I report an active-shift issue?

### Shifts And Scheduling

- How does matching work?
- What information is shown before acceptance?
- How are conflicts detected?
- How do recurring shifts work?
- What happens if a worker is late or absent?
- How is a replacement requested?

### Check-In, Check-Out, And Timesheets

- How do workers check in?
- What happens if check-in fails?
- How are hours recorded?
- Who approves the timesheet?
- How are corrections handled?
- Does Resident Job use location information?

Guardrail:

- Location answers must remain privacy-aware and jurisdiction-neutral.

### Pricing, Billing, And Invoices

Financial UX Standard applies.

- Is an estimate the final charge?
- What is a payment authorization?
- When is the final charge calculated?
- What may affect the final amount?
- How are travel or urgency adjustments shown?
- How do billing disputes work?
- Is employer billing the same as worker compensation?

Guardrails:

- Estimate is not the final charge.
- Authorization is not payment.
- Employer billing and worker compensation are separate.
- Do not hardcode final rates, fees, taxes, or commission percentages.

### Worker Earnings And Payments

- How are earnings calculated?
- When can a worker see payment status?
- What happens if hours are disputed?
- Are deductions or taxes handled the same everywhere?
- How can payment information be updated securely?

Guardrail:

- Do not provide jurisdiction-specific tax advice.

### Documents And Compliance

- Which documents may be requested?
- How are credentials reviewed?
- Can a document expire?
- What happens if a required document is missing?
- Are background checks available everywhere?
- How are documents protected?

Guardrail:

- Use trust mechanisms, not unsupported trust claims.

### Safety And Active-Shift Support

- What is an active-shift issue?
- How do I report a no-show, late arrival, or inability to continue?
- Can Resident Job guarantee a replacement?
- What should I do in a medical or immediate safety emergency?
- How do I follow an existing support case?

Guardrails:

- Do not hardcode an emergency number.
- Do not guarantee replacement availability.

### Privacy And Security

- What information does Resident Job collect?
- Why may sign-in be required?
- How can I make a privacy request?
- How are support cases protected?
- Should I send card details, passwords, banking credentials, or unnecessary health records?

Required answer:

- Do not send sensitive credentials through general support forms.

### AI And Automated Assistance

- Where is AI used?
- Does AI make hiring decisions?
- Can AI assign or discipline a worker?
- How are recommendations reviewed?
- Can I challenge or report an incorrect recommendation?

Required answer:

- AI assists. Authorized people make consequential decisions.

## H. Answer Design

Each answer supports:

- Concise summary.
- Expandable detail.
- Related articles.
- Relevant action.
- Last-reviewed or version placeholder.
- Country/account-specific caveat where necessary.
- "Was this helpful?" feedback.

Rules:

- Do not display fabricated update dates.
- Do not publish AI-generated FAQ content automatically.
- Do not present general answers as legal, clinical, tax, payroll, healthcare, or employment advice.

## I. Contextual Actions

Examples:

- Create worker account.
- Request staff.
- View open shifts.
- Update documents.
- View invoice.
- Contact support.
- Open Active-Shift Support.
- Sign in for account-specific help.

Context rules:

- Show actions appropriate to the user's role and authentication state.
- Public users see public actions only.
- Account-specific records require authentication.
- Shift-specific actions require authorization.

## J. Required States

- Default.
- Search results.
- No results.
- Category selected.
- Expanded answer.
- Signed-in contextual answer.
- Signed-out answer.
- Unavailable account-specific information.
- Offline state.
- Content-under-review state.
- Feedback submitted.
- Active-shift escalation state.

## K. Mobile Wireframe

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
│ WHO ARE YOU?                 │
│ Workers                      │
│ Employers                    │
│ Residence managers           │
│ Applicants                   │
│ Billing                      │
│ Documents                    │
│ Account/technical            │
│ Privacy/security             │
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
│ Related articles             │
│ Relevant action              │
│ Version/review placeholder   │
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

Mobile priorities:

- Search first.
- User pathway chips.
- Compact categories.
- Accessible accordions.
- Sticky or visible Active-Shift Support action.
- Large touch targets.
- No dense walls of text.

## L. Desktop Behavior

Desktop uses:

- Search/header region.
- Category navigation.
- Answer content.
- Related actions.
- Support and Active-Shift panel.
- Feedback controls.

## M. Accessibility

- Semantic headings.
- Keyboard-accessible accordions.
- Visible focus.
- Screen-reader expanded/collapsed state.
- Search result announcements.
- Readable answer length.
- No color-only distinctions.
- Clear link purpose.
- Accessible feedback controls.
- Large enough touch targets on mobile.

## N. Security And Privacy

The FAQ must protect against:

- Exposure of private account information in public answers.
- Account-specific links without authentication.
- Sensitive information in search suggestions.
- Unsafe query logging.
- Uncontrolled feedback publication.
- Unauthorized content changes.

Future API requirements:

- Rate limiting.
- Abuse prevention.
- Audit trail for published content changes.
- Controlled content authoring and approval.
- Secure feedback routing.

## O. AI Boundaries

AI may:

- Interpret search intent.
- Suggest relevant approved FAQ entries.
- Summarize approved content.
- Identify duplicate questions.
- Propose draft content for human review.
- Detect missing content areas.

AI must not:

- Invent policy.
- Provide unapproved legal, tax, clinical, payroll, or employment guidance.
- Access or expose private records without authorization.
- Publish answers automatically.
- Claim an account or case outcome.
- Replace Active-Shift Support.

## P. Governance And Content Safety

Every FAQ answer must have:

- Content owner.
- Review status.
- Applicability scope.
- Version or review placeholder.
- Source or approved business-rule reference.
- Escalation path for uncertain answers.

Do not publish AI-generated FAQ content automatically.

## Q. Self Validation

- FAQ introduction distinguishes general information from account-specific help.
- Search includes suggestions, no-results state, and safe fallback.
- User pathways are clear.
- Active-Shift Support is visible and distinct.
- Core FAQ categories cover workers, employers, residence managers, applicants, billing, documents,
  safety, privacy, and AI.
- Financial answers follow the Financial UX Standard.
- No hardcoded rates, fees, taxes, commission percentages, emergency numbers, response times, or
  unsupported availability claims are introduced.
- Answer design supports summary, expandable detail, related articles, action, metadata, and
  feedback.
- AI boundaries are explicit.
- Content governance metadata is required.
- Page 007 remains blocked.
- No implementation work has begun.

