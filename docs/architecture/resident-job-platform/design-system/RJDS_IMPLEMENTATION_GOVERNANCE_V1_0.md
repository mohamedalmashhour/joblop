# RJDS Implementation Governance v1.0

Status: Approved governance companion
Applies to: Resident Job implementation work after architecture and design approval
RJDS baseline: RJDS v1.0 approved and frozen
Implementation status: Documentation only

## Purpose

This manual tells engineers and AI coding agents how to implement Resident Job inside the approved governance system.

It does not authorize new features, redesigns, schema changes, APIs, or workflow changes. It defines how approved and frozen architecture and design move into code safely.

## Governance Position

Implementation sits below platform vision, architecture, and design-system governance.

```text
Platform Vision
↓
Architecture Governance (ACR)
↓
Design System Governance (DCR)
↓
Implementation Governance
↓
Verification
↓
Release
```

Implementation must not reinterpret or expand approved architecture or RJDS.

## 1. Before Implementation

Every implementation task must begin with a governance check.

### Required Reading

Read the approved source documents before coding:

- Architecture Freeze or approved ACR when applicable.
- Approved page wireframe or feature specification.
- Product Design Review.
- Revision 1 artifacts where they exist.
- Approval Record.
- RJDS v1.0.
- DCR if the task includes a visual or component change.
- Relevant upstream and downstream workflow boundaries.

Do not rely on memory or previous summaries when approved documents are available.

### Pre-Implementation Checklist

```text
□ Architecture already approved?
□ Design already approved?
□ Page or feature frozen?
□ ACR required?
□ DCR required?
□ Existing component available?
□ Existing workflow available?
□ Existing design token available?
□ Source-of-truth boundary clear?
□ Permission boundary clear?
□ Privacy boundary clear?
□ Security boundary clear?
□ AI boundary clear?
□ Accessibility requirements clear?
□ Test strategy clear?
□ Schema/API impact confirmed?
```

If any answer is unclear, stop for owner direction before writing code.

### Classification

Classify the task before implementation:

| Task type | Required path |
| --- | --- |
| Architecture, workflow, permission, data, schema, or API change | ACR |
| Visual, component, token, layout, motion, or responsive change | DCR |
| Both architecture and visual change | ACR and DCR |
| Bug fix with no architecture or visual impact | Standard engineering |
| Refactor with no behavioral or visual impact | Standard engineering |

## 2. During Implementation

### Scope Control

Implement the smallest complete version that satisfies the approved requirement.

Do not:

- Redesign the page.
- Add unapproved components.
- Add unapproved workflow states.
- Change page ownership.
- Absorb neighboring workflows.
- Change permissions.
- Change data ownership.
- Add schema, API, migration, backend, or integration work unless explicitly approved.
- Convert fixture behavior into claimed production behavior.

### Component Reuse

Use existing components first.

When a component is missing:

1. Check RJDS component specifications.
2. Check whether an approved DCR exists.
3. If no DCR exists and a new component family or visual pattern is required, stop.

Small implementation wrappers are acceptable only when they preserve the approved component family and do not create a new design pattern.

### Token Use

Use approved tokens for:

- Color.
- Typography.
- Spacing.
- Radius.
- Focus.
- Touch targets.
- Status treatment.

Do not introduce one-off visual constants when an approved token exists. If a new token is needed, open a DCR.

### Accessibility Requirements

Implementation must preserve:

- Semantic headings.
- Keyboard navigation.
- Visible focus.
- Accessible names for controls.
- Plain-language validation.
- Non-color-only status signals.
- Touch targets of at least `44px`.
- Readable text.
- Mobile-first behavior where applicable.
- Reduced-motion support where motion exists.

### Privacy Requirements

Show only the minimum necessary information for the user role and task.

Do not expose:

- Secrets.
- Credentials.
- Tokens.
- Full banking details.
- Tax identifiers.
- Health information.
- Restricted personal information.
- Investigation material.
- Hidden system prompts.
- Internal security details.

### Security Requirements

Security-sensitive UI must avoid account enumeration, role leakage, provider leakage, and implementation-detail leakage.

Errors should explain what the user can do next without revealing confidential system state.

### AI Requirements

AI must remain advisory.

Implementation must preserve:

```text
AI recommends
↓
Human reviews
↓
Human approves
↓
Authoritative workflow executes
```

AI must not:

- Assign workers.
- Approve applicants.
- Modify shifts.
- Confirm attendance.
- Approve timesheets.
- Calculate payroll.
- Issue invoices.
- Execute payments.
- Publish or moderate ratings autonomously.
- Send messages autonomously.
- Close support cases.
- Override human decisions.

### Financial Requirements

Financial UI must preserve:

- Estimate does not equal final charge.
- Authorization does not equal payment.
- Invoice does not equal payment.
- Payroll does not equal payment.
- Sent does not equal settled.
- Settled does not equal irreversible.
- Worker payable does not equal employer invoice.

Do not expose internal formulas, banking details, tax calculations, or payment execution controls unless explicitly approved.

### Fixture Honesty

Fixture-backed or demonstration data must be truthful.

Do not claim:

- Persistence.
- Backend success.
- Payment success.
- Payroll execution.
- Notification delivery.
- Assignment confirmation.
- Worker acceptance.
- Attendance validation.

unless the authoritative workflow exists.

## 3. After Implementation

### Required Validation

Run the validation appropriate to the changed area:

- Type checking.
- Linting.
- Targeted tests.
- Integration tests where applicable.
- Accessibility checks where available.
- Build.
- Manual route review where appropriate.

Document skipped checks and why they were skipped.

### Conformity Review

After implementation, verify:

- Approved architecture was followed.
- RJDS was followed.
- No ACR was needed but skipped.
- No DCR was needed but skipped.
- No adjacent workflow was absorbed.
- No unapproved visual pattern was added.
- No privacy, security, audit, accessibility, or AI boundary was weakened.

### Diff Review

Before committing, review the final diff and confirm:

- Only intended files changed.
- No unrelated user changes were staged.
- No secrets or environment values were added.
- No unapproved schema, API, migration, or backend change was included.
- Tests reflect approved behavior only.

## 4. Definition of Done

A feature is complete only when all of the following are true:

- Approved architecture satisfied.
- Approved design/RJDS satisfied.
- ACR requirements satisfied when applicable.
- DCR requirements satisfied when applicable.
- Existing component system reused where possible.
- Accessibility requirements met.
- Privacy requirements met.
- Security requirements met.
- AI boundaries preserved.
- Auditability preserved where governed actions exist.
- Tests added or updated.
- Required validation passed or documented.
- Final diff reviewed.
- Focused local commit created when authorized.
- No push, merge, or deploy occurred unless explicitly authorized.

## 5. Commit Governance

Commits should be focused and local.

Use one commit per coherent implementation unit unless the owner authorizes a larger milestone.

Do not:

- Amend accepted commits.
- Squash accepted commits.
- Include unrelated files.
- Include documentation-only changes in implementation commits unless required by the task.
- Include implementation files in documentation-only commits.

## 6. Stop Conditions

Stop before implementation or commit if any of these appear:

- Required ACR is missing.
- Required DCR is missing.
- Approved page or feature is not frozen.
- Scope requires schema changes not already approved.
- Scope requires API changes not already approved.
- Scope requires backend changes not already approved.
- Existing component cannot satisfy the design and no DCR exists.
- Approved documents conflict.
- Privacy boundary is unclear.
- Security boundary is unclear.
- AI authority boundary is unclear.
- Financial meaning is ambiguous.
- Testing cannot be performed and risk is high.

Report the blocker and request owner direction.

## 7. Release Boundary

Implementation completion does not authorize production release.

Release requires separate verification of:

- Environment configuration.
- Security review.
- Privacy review.
- Accessibility review.
- Operational readiness.
- Data migration readiness where applicable.
- Monitoring.
- Rollback.
- Owner release approval.

## Final Rule

Implementation is execution of approved governance, not a place to make hidden product decisions.
