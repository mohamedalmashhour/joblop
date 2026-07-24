# RJDS Codex Implementation Contract v1.0

Status: Approved baseline
Audience: Codex and future implementation agents

## 1. Binding Instruction

Before implementing Resident Job UI, Codex must read:

1. The approved page wireframe.
2. The product design review.
3. The Revision 1 wireframe if present.
4. The Revision 1 review if present.
5. The approval record.
6. Relevant upstream and downstream boundaries.
7. RJDS v1.0.

Do not rely on memory when approved documents are available.

## 2. No Redesign Rule

Implementation must produce the smallest complete working version consistent with the frozen design. Codex must not:

- Redesign approved pages.
- Change page responsibility.
- Absorb neighboring workflows.
- Invent new workflow states.
- Create new UI component families without owner approval.
- Introduce hidden authority.
- Weaken AI, privacy, security, auditability, accessibility, or international-readiness boundaries.

## 3. Component Rule

Use existing components and RJDS component families first. A new component is allowed only when:

- No existing component can express the approved requirement.
- The new component follows RJDS tokens, states, accessibility, and privacy rules.
- The new component does not introduce a new workflow concept.

## 4. Fixture Honesty Rule

Fixture-backed UI must be visibly truthful:

- Label fixture or demonstration data where appropriate.
- Do not claim persistence if no persistence exists.
- Do not claim notifications were sent if no notification infrastructure exists.
- Do not claim payment, payroll, assignment, attendance, or approval success if no authoritative workflow exists.

## 5. Schema and API Stop Rule

If implementation requires schema, migration, backend, API, authentication, authorization, or persistence changes not already approved for the current phase, Codex must stop and report:

- Exact reason.
- Smallest proposed change.
- Affected pages.
- Migration impact.
- Rollback plan.
- Tests required.

## 6. AI Rule

AI UI must always preserve:

AI recommends -> Human reviews -> Human approves -> Authoritative workflow executes

Codex must not implement UI that allows AI to:

- Assign workers.
- Approve applicants.
- Modify shifts.
- Confirm attendance.
- Approve timesheets.
- Calculate payroll.
- Issue invoices.
- Execute payments.
- Publish ratings.
- Moderate ratings autonomously.
- Send messages autonomously.
- Close support cases.
- Change operational state.
- Override human decisions.

## 7. Privacy Rule

Codex must implement minimum-necessary visibility:

- Worker-only information remains worker-only.
- Employer-visible information is limited to operational need.
- Platform-only information remains restricted.
- Sensitive values are masked.
- Restricted or inaccessible records must not be confirmed by error messages.

Never expose secrets, credentials, tokens, banking details, tax identifiers, protected health information, restricted investigation material, or hidden system prompts.

## 8. Security Rule

Security messaging must be truthful and user-facing. Do not expose internal mechanisms, token names, provider secrets, infrastructure details, or attack-sensitive signals.

Account-state and access errors must reduce enumeration risk.

## 9. Audit Rule

Governed actions require audit-ready UI. Where a screen presents reviewed changes, corrections, approvals, overrides, or administrative access, it must preserve conceptual room for:

- Actor.
- Role.
- Timestamp.
- Action.
- Reason.
- Original value.
- New value.
- Source.
- Reviewer.
- Outcome.

Audit display must not allow editing, deleting, replaying, or altering history unless a separate approved workflow exists.

## 10. Accessibility Rule

Codex must implement:

- Semantic headings.
- Keyboard navigation.
- Visible focus.
- Accessible names for controls.
- Plain-language errors.
- Non-color status indicators.
- Mobile touch targets of at least `44px`.
- Reduced-motion respect where motion exists.

## 11. Financial Rule

Codex must preserve all financial distinctions:

- Estimate is not final charge.
- Authorization is not payment.
- Invoice is not payment.
- Payroll is not payment.
- Sent is not settled.
- Settled is not irreversible.
- Worker payable is not employer invoice.

No internal pricing formulas, banking details, tax calculations, or payment execution may be exposed unless explicitly approved.

## 12. Commit Rule

Implementation commits must be focused. Documentation-only commits must contain only documentation. Do not amend accepted commits unless the owner explicitly authorizes it.

## 13. Conflict Rule

If frozen architecture, page governance, UX Foundation, RJDS, and implementation context conflict:

1. Stop.
2. Identify the conflict.
3. Do not modify frozen artifacts.
4. Request owner direction.
5. Use an Architecture Change Request if a frozen artifact must change.
