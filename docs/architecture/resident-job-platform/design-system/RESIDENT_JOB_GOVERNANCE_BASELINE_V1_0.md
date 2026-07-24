# Resident Job Governance Baseline v1.0

Status: Approved
Freeze status: Frozen
Applies to: Resident Job architecture, design system, governance, implementation, verification, and release process
Implementation status: Documentation only

## Purpose

This document freezes the Resident Job governance framework as a governed product baseline.

The governance system now controls how architecture, design, implementation, verification, and release decisions are classified, approved, changed, and frozen.

Future changes to the governance process itself require a Governance Change Request (GCR).

## Baseline Status

```text
Resident Job Governance Baseline v1.0

APPROVED
FROZEN
```

## Included Governance Layers

### Level 0: Platform Vision

Defines the product direction, market intent, operating philosophy, and high-level product boundaries.

### Level 1: Architecture Governance

Controls:

- Product architecture.
- Page ownership.
- Workflow boundaries.
- Source-of-truth definitions.
- Data entity boundaries.
- Permission models.
- State machines.
- API and schema authority.

Change path:

```text
ACR
Architecture Change Request
↓
Architecture Review
↓
Approval
↓
Implementation
↓
Validation
↓
Freeze
```

### Level 2: Design System Governance

Controls:

- RJDS design system.
- Component specifications.
- Design tokens.
- Visual hierarchy.
- Responsive rules.
- Accessibility patterns.
- Brand rules.
- Motion rules.
- AI visual presentation.
- Financial visual treatment.

Change path:

```text
DCR
Design Change Request
↓
Design Review
↓
Approval
↓
Implementation
↓
Validation
↓
Freeze
```

### Level 3: Governance Decision Matrix

Controls change classification before work begins.

The matrix determines whether a request follows:

- ACR.
- DCR.
- ACR and DCR.
- Standard engineering process.
- Documentation process.
- Owner governance.

### Level 4: Implementation Governance

Controls how approved architecture and design move into code.

Includes:

- Pre-implementation checks.
- ACR/DCR classification.
- Component and token reuse.
- Accessibility requirements.
- Privacy requirements.
- Security requirements.
- AI requirements.
- Financial safeguards.
- Fixture honesty.
- Post-implementation validation.
- Definition of Done.
- Commit governance.
- Stop conditions.
- Release boundary.

### Level 5: Implementation

Implementation executes approved governance. It must not become a place for hidden product, architecture, design, privacy, security, AI, financial, or release decisions.

### Level 6: Verification

Verification confirms:

- Architecture conformity.
- Design-system conformity.
- Functional correctness.
- Accessibility.
- Privacy.
- Security.
- AI boundary compliance.
- Financial boundary compliance.
- Test coverage.
- Build health.

### Level 7: Release

Release requires separate approval after implementation and verification.

Implementation completion does not authorize production release.

## Governance Change Request

GCR means Governance Change Request.

Use a GCR when changing the governance process itself.

Examples:

- Change ACR lifecycle.
- Change DCR lifecycle.
- Change approval requirements.
- Change freeze rules.
- Change implementation stop conditions.
- Change Definition of Done.
- Change governance hierarchy.
- Change how conflicts are resolved.
- Add or remove mandatory review gates.
- Reclassify which request types require ACR or DCR.

## ACR, DCR, and GCR Separation

| Request type | Controls | Does not control |
| --- | --- | --- |
| ACR | Product architecture | Visual design-system changes unless paired with DCR |
| DCR | Visual and design-system changes | Product architecture changes unless paired with ACR |
| GCR | Governance process changes | Product architecture or visual design changes unless paired with ACR or DCR |

Core rule:

```text
No governance path silently authorizes another.
```

## GCR Lifecycle

Every Governance Change Request follows:

```text
Draft
↓
Governance Review
↓
Revision
↓
Owner Approval
↓
Freeze
↓
Application to future work
```

GCRs are not retroactive unless the owner explicitly states that a frozen artifact or accepted implementation must be reopened.

## GCR Template

Every GCR must include:

- GCR ID.
- Title.
- Requested by.
- Date.
- Governance area affected.
- Current rule.
- Proposed rule.
- Reason for change.
- Affected documents.
- Affected teams or contributors.
- Risk of changing.
- Risk of not changing.
- Migration or adoption plan.
- Retroactive impact, if any.
- Owner decision.
- Freeze status.

## Frozen Governance Documents

This baseline recognizes the following governance documents as part of the controlled framework:

- Architecture Freeze v1.0.
- UX Foundation.
- Page approval and freeze process.
- Phase review process.
- ACR process.
- Resident Job Design System v1.0.
- DCR process.
- Visual Change Control Policy.
- Governance Decision Matrix.
- Implementation Governance Manual.
- Codex Implementation Contract.

## Standard Operating Rule

Before any future work begins, classify it:

```text
Architecture change?
↓
ACR

Design-system or visual change?
↓
DCR

Governance process change?
↓
GCR

No architecture, design, or governance change?
↓
Standard engineering process
```

If classification is unclear, stop for owner direction.

## Final Governance Recommendation

The governance framework is now stable enough for implementation use.

Do not add new governance documents unless:

- A real ambiguity appears during implementation.
- A governance rule blocks correct work.
- A governance conflict is discovered.
- The owner explicitly authorizes a GCR.

The preferred next step is to use the framework in implementation, validate it through real product work, and change it only through formal GCR approval.
