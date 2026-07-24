# Resident Job Design System v1.0

Status: Approved baseline
Owner: Product Design Governance
Applies to: Resident Job public website, worker portal, employer portal, operations surfaces, administration, AI governance, reporting, finance, messaging, and support

## 1. Purpose

Resident Job is an operational healthcare staffing platform. Its interface must help workers, employers, schedulers, and administrators make correct decisions under real constraints: qualifications, availability, privacy, money, attendance, human review, and auditability.

RJDS v1.0 defines how Resident Job should look, behave, communicate, and constrain implementation. It exists to prevent drift as the product moves from frozen wireframes into working software.

## 2. Product Personality

Resident Job should feel:

- Trustworthy, not promotional.
- Operational, not decorative.
- Human-supervised, not automated beyond control.
- Clear under pressure.
- Mobile-first for workers.
- Dense but calm for employers and administrators.
- Internationally ready and country-neutral unless localization is explicitly approved.

The design tone is professional healthcare operations. It should never feel like a casual job board, social feed, consumer marketplace, or opaque AI tool.

## 3. Design Principles

### Operational Clarity

Every page must answer the user's immediate operational question first:

- Worker: What do I need to do now?
- Employer: What needs staffing, review, or approval?
- Admin: What requires governance attention?
- Support: What state changed, who acted, and what can be done next?

### Single Responsibility

Each page owns one primary responsibility. Do not merge neighboring workflow concepts into one surface. In particular:

- Recommendation does not equal assignment.
- Assignment does not equal worker acceptance.
- Attendance does not equal approved hours.
- Timesheet approval does not equal payroll.
- Payment sent does not equal settled.
- Audit entry does not equal authoritative record.

### Human Authority

Human review and approval must be visually obvious wherever the workflow can affect staffing, eligibility, money, compliance, restrictions, privacy, or disputes.

### AI Transparency

AI is advisory. AI may summarize, explain, recommend, identify missing information, or suggest navigation. AI must never appear to approve, assign, pay, discipline, verify, publish, or alter authoritative state.

### Privacy By Default

Every UI must expose only the minimum necessary information for the user role and task. Worker-only, employer-visible, platform-only, support-visible, and restricted information must remain visually and functionally distinct.

### Financial Truthfulness

Financial pages must distinguish estimates, authorizations, invoices, payments, payroll, settlement, refunds, and payables. Never imply that estimated, scheduled, or pending money is final.

### Auditability

Governed actions must be presented as traceable. UI should make room for actor, role, timestamp, reason, source, status, and review path where appropriate.

### Accessibility First

The target is WCAG 2.2 AA. Critical information cannot rely on color alone. Keyboard navigation, focus order, screen-reader labels, readable text, and plain-language errors are required.

## 4. Brand Identity

Resident Job uses a restrained operating-system identity:

- Primary impression: capable, calm, and structured.
- Primary palette: dark operational blue with white and light neutral surfaces.
- Accent language: green for ready/approved, amber for warning/pending, red for risk/blocker, blue for focus/information.
- Shape language: restrained cards, clear panels, pill-shaped tags only where they represent filters, badges, or capsules.
- Motion language: minimal and functional.

Avoid:

- One-note decorative gradients.
- Consumer marketplace visual noise.
- Overly rounded decorative cards.
- Marketing hero treatment inside operational portals.
- Decorative AI symbolism that makes AI appear magical or authoritative.

## 5. Content Rules

Use plain operational language:

- Say "Recommended" instead of "Best".
- Say "Pending review" instead of "Approved soon".
- Say "Estimated" when values are not final.
- Say "Available where configured" when capability depends on jurisdiction, provider, or business rules.
- Say "Human review required" where final authority sits with a person.

Do not use:

- Unsupported scale claims.
- Fake testimonials or metrics.
- Jurisdiction-specific legal claims unless approved.
- Promises of staffing, employment, payment, eligibility, response time, or replacement.

## 6. Trust Mechanisms

Trust is communicated through mechanisms, not claims. Appropriate mechanisms include:

- Verified onboarding workflow.
- Credential review workflow.
- Background-check process where available and applicable.
- Human review before governed decisions.
- Attendance evidence.
- Secure document handling.
- Masked sensitive data.
- Audit history.
- Clear escalation paths.
- Explicit content governance.

Avoid unsubstantiated trust claims such as "industry leader", "most trusted", "guaranteed compliance", or "certified platform" unless evidence and legal approval exist.

## 7. Governance Metadata

Policy, FAQ, legal, AI, financial, support, and compliance content must expose governance metadata where relevant:

- Content owner.
- Review status.
- Version.
- Last reviewed placeholder or actual approved date.
- Applicability.
- Source of truth.
- Escalation path.

Metadata should be compact and visible without overpowering the primary task.

## 8. Implementation Boundary

RJDS authorizes consistent design implementation only. It does not authorize:

- New schema.
- New APIs.
- New backend workflows.
- New financial rules.
- New legal language.
- New AI automation.
- New page responsibilities.
- Changes to frozen architecture.

Implementation must read the approved page documents before coding.
