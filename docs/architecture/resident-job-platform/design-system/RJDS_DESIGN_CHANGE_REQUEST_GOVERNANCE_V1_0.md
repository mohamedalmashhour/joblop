# RJDS Design Change Request Governance v1.0

Status: Approved governance companion
Applies to: Resident Job Design System v1.0 and future RJDS revisions
RJDS baseline: Approved and frozen
Implementation status: Documentation only

## Purpose

This document defines the formal Design Change Request (DCR) categories used to control changes to the Resident Job Design System after RJDS v1.0 is approved and frozen.

No approved RJDS artifact may be changed informally. Any change that affects visual language, components, tokens, accessibility, responsiveness, brand, motion, or implementation rules must be routed through a DCR.

## DCR Lifecycle

Every Design Change Request follows this lifecycle:

```text
Draft
↓
Review
↓
Revision
↓
Approval
↓
Freeze
↓
Implementation
```

Implementation may begin only after the approved DCR is frozen.

## DCR Categories

### DCR-001: New Component

Use when a new reusable UI component family or component variant is required.

Examples:

- New governed comparison panel.
- New AI evidence viewer.
- New financial exception component.
- New worker/employer capsule pattern.

Required review:

- Purpose.
- Existing component alternatives.
- States.
- Accessibility.
- Privacy.
- Auditability.
- Responsive behavior.
- Source-of-truth boundary.
- Implementation scope.

Approval rule:

Approve only if no existing RJDS component can satisfy the approved product need.

### DCR-002: Modify Existing Component

Use when an approved RJDS component needs a behavior, layout, state, or usage-rule change.

Examples:

- Add a restricted state to a table component.
- Change badge behavior.
- Add a new field to the AI advisory panel.
- Modify calendar status display.

Required review:

- Current component behavior.
- Proposed change.
- Affected pages.
- Backward compatibility.
- Accessibility impact.
- Privacy and security impact.
- Migration or implementation impact.

Approval rule:

Approve only if the change improves consistency, clarity, safety, accessibility, or implementation correctness without breaking frozen page responsibilities.

### DCR-003: Change Design Token

Use when a color, typography, spacing, radius, focus, motion, or sizing token changes.

Examples:

- Change primary brand color.
- Add a semantic token.
- Adjust spacing scale.
- Change minimum touch target.

Required review:

- Token affected.
- Reason for change.
- Affected components.
- Affected pages.
- Accessibility contrast impact.
- Brand impact.
- Implementation impact.

Approval rule:

Approve only after verifying no accessibility, brand, or regression risk is introduced.

### DCR-004: Accessibility Update

Use when RJDS accessibility requirements change or an accessibility gap is discovered.

Examples:

- Add a new focus management rule.
- Improve screen-reader pattern.
- Change color contrast requirement.
- Add reduced-motion behavior.
- Add keyboard shortcut governance.

Required review:

- Accessibility issue.
- Users affected.
- WCAG relationship.
- Required component or template changes.
- Testing approach.
- Regression risk.

Approval rule:

Accessibility improvements may be prioritized above visual consistency when required for inclusive access.

### DCR-005: Responsive Rule

Use when mobile, tablet, desktop, density, layout, or breakpoint behavior changes.

Examples:

- Add a new dashboard collapse rule.
- Change mobile worker dashboard hierarchy.
- Adjust admin table behavior on tablet.
- Add a wide-screen layout standard.

Required review:

- Current responsive behavior.
- Proposed behavior.
- Affected page templates.
- Affected components.
- Mobile-first impact.
- Accessibility impact.
- Implementation impact.

Approval rule:

Approve only if the change preserves task priority and does not hide governed state or critical actions.

### DCR-006: Brand Update

Use when brand identity, tone, iconography, naming, visual personality, or content style changes.

Examples:

- Update brand palette.
- Add illustration rules.
- Change voice and tone.
- Update product naming.
- Add logo usage rules.

Required review:

- Brand change description.
- Reason.
- Affected product areas.
- Accessibility impact.
- Internationalization impact.
- Legal or policy review need.
- Implementation scope.

Approval rule:

Approve only if the change preserves Resident Job's healthcare operations identity and does not introduce unsupported claims.

### DCR-007: Motion Update

Use when animation, transition, loading behavior, or interaction motion changes.

Examples:

- Add drawer transition.
- Add loading skeleton behavior.
- Add state-change animation.
- Change reduced-motion behavior.

Required review:

- Motion purpose.
- Duration and easing.
- Accessibility and reduced-motion behavior.
- Performance impact.
- Critical-state visibility.
- Affected components.

Approval rule:

Approve only if motion supports comprehension and never hides critical state, audit evidence, errors, warnings, or approvals.

## Required DCR Template

Each DCR must include:

- DCR ID.
- Title.
- Category.
- Requested by.
- Date.
- Current RJDS version.
- Problem statement.
- Proposed change.
- Affected components.
- Affected templates.
- Affected pages.
- Accessibility impact.
- Privacy impact.
- Security impact.
- AI governance impact.
- Internationalization impact.
- Implementation impact.
- Testing requirements.
- Rollback plan.
- Review status.
- Owner decision.

## Review Status Values

Controlled values only:

- Draft.
- Under Review.
- Revision Required.
- Approved.
- Frozen.
- Rejected.
- Superseded.

## Freeze Rule

Once a DCR is approved and frozen, implementation may proceed only within the approved scope. If implementation reveals a larger change, stop and open a new DCR.

## Relationship to RJDS v1.0

RJDS v1.0 remains approved and frozen. This governance document does not modify RJDS v1.0 content. It defines how future RJDS changes are requested, reviewed, approved, frozen, and implemented.
