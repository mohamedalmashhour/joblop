# RJDS Visual Change Control Policy v1.0

Status: Approved governance companion
Applies to: All future Resident Job visual, interaction, and design-system changes
RJDS baseline: RJDS v1.0 approved and frozen
Implementation status: Documentation only

## Purpose

This policy makes Design Change Requests (DCRs) mandatory for every future visual change to Resident Job. It creates a parallel governance path beside Architecture Change Requests (ACRs), so architecture and design-system decisions remain independently controlled.

## Parallel Governance Model

| Governance path | Controls | Examples |
| --- | --- | --- |
| `ACR` | Architecture changes | Page ownership, workflows, data entities, permissions, APIs, source-of-truth boundaries |
| `DCR` | Design-system changes | Components, tokens, layout rules, accessibility rules, brand, motion, visual hierarchy |

## Mandatory DCR Rule

Every future visual change must go through a DCR before implementation.

This includes changes to:

- Component structure.
- Component states.
- Component variants.
- Color tokens.
- Typography.
- Spacing.
- Radius.
- Icons.
- Layout templates.
- Dashboard hierarchy.
- Responsive behavior.
- Accessibility patterns.
- Motion.
- Brand expression.
- AI presentation.
- Financial visual treatment.
- Governance metadata presentation.

## No Informal Visual Changes

Codex and future contributors must not make informal visual changes during implementation, even when the change appears small.

Examples of prohibited informal changes:

- Changing button size or color without a DCR.
- Adding a new card style without a DCR.
- Introducing a new badge state without a DCR.
- Changing dashboard density without a DCR.
- Modifying mobile layout behavior without a DCR.
- Adding decorative motion without a DCR.
- Changing AI recommendation styling without a DCR.

## When ACR and DCR Are Both Required

Some changes affect both architecture and design. In those cases, both governance paths are required.

Examples:

- A new workflow page that needs a new component family.
- A new authoritative state that needs a new badge pattern.
- A new AI workflow that changes both decision boundaries and AI presentation.
- A new financial lifecycle state that changes both workflow architecture and financial UI treatment.

Rule:

```text
Architecture change
↓
ACR required

Design-system change
↓
DCR required

Both architecture and design-system change
↓
ACR and DCR required
```

## DCR Does Not Authorize Architecture Change

A DCR may approve design-system changes only. It must not authorize:

- New page responsibility.
- New workflow ownership.
- New source-of-truth boundary.
- New permission model.
- New data entity.
- New API.
- New schema.
- New implementation scope outside the approved design change.

If a requested design change requires architecture change, stop and open an ACR.

## ACR Does Not Authorize Visual Drift

An ACR may approve architecture changes only. It must not automatically authorize:

- New visual style.
- New component family.
- New token.
- New responsive pattern.
- New brand expression.
- New motion pattern.

If an approved architecture change requires new design-system behavior, open a DCR before implementation.

## Implementation Requirement

Before implementing any visual change, Codex must confirm:

- Applicable DCR ID.
- DCR status is approved and frozen.
- Affected component or token.
- Affected pages.
- Accessibility impact reviewed.
- Privacy impact reviewed.
- Security impact reviewed.
- AI impact reviewed where applicable.

If no DCR exists, do not implement the visual change.

## Final Rule

RJDS v1.0 remains approved and frozen. Future visual evolution is allowed only through approved and frozen DCRs.
