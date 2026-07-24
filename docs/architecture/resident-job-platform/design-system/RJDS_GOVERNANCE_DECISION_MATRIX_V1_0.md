# RJDS Governance Decision Matrix v1.0

Status: Approved governance companion
Applies to: Resident Job architecture, design system, implementation, verification, and release work
RJDS baseline: RJDS v1.0 approved and frozen
Implementation status: Documentation only

## Purpose

This matrix defines which governance path must be used before work begins. It prevents ambiguity between architecture governance, design-system governance, and ordinary engineering work.

Core principle:

```text
Neither path silently authorizes the other.
```

An Architecture Change Request (ACR) does not authorize visual drift. A Design Change Request (DCR) does not authorize architecture change.

## Governance Hierarchy

```text
Resident Job Governance

Level 1
Platform Vision
↓
Level 2
Architecture (ACR)
↓
Level 3
Design System (DCR)
↓
Level 4
Implementation
↓
Level 5
Verification
↓
Level 6
Release
```

## Decision Matrix

| Change request | Governance path | Example | Notes |
| --- | --- | --- | --- |
| Platform vision | Owner governance | Change target market or operating model | May require ACR and DCR afterward |
| Page ownership | ACR | Move payments from Finance to Admin | Changes source-of-truth boundaries |
| Business workflow | ACR | Add a booking approval step | Requires architecture review |
| Database schema | ACR | Add a new booking table | Requires schema review before implementation |
| API contract | ACR | Change payment endpoint response | May affect frontend and integration tests |
| Permission model | ACR | Add a new Admin capability | Requires security and role review |
| Data entity | ACR | Add `JobRequest` or `WorkerOffer` | Must define ownership and lifecycle |
| State machine | ACR | Add a new assignment state | Must preserve cross-page consistency |
| Source-of-truth boundary | ACR | Make invoice own settlement status | Requires architecture review |
| AI authority boundary | ACR | Allow AI to recommend dispatch actions | DCR may also be required for presentation |
| Privacy boundary | ACR | Expose new worker data to employers | Requires privacy/security review |
| Financial rule | ACR | Add cancellation fee logic | Requires financial governance |
| Design tokens | DCR | Change spacing scale | Requires accessibility and regression review |
| Colors | DCR | Update brand palette | Requires contrast validation |
| Typography | DCR | Change heading scale | Requires readability review |
| Component library | DCR | Add card or button variant | Requires component review |
| Component state | DCR | Add restricted state to a table | Must not alter workflow ownership |
| Dashboard layout | DCR | Redesign employer dashboard hierarchy | Requires responsive and accessibility review |
| Responsive behavior | DCR | Change mobile collapse rules | Requires mobile-first review |
| Motion | DCR | Add state-change animation | Must respect reduced motion |
| Brand expression | DCR | Add illustration style | Must avoid unsupported claims |
| AI visual presentation | DCR | Change AI recommendation panel styling | ACR required if AI authority changes |
| Financial visual treatment | DCR | Change invoice lifecycle timeline design | ACR required if financial states change |
| Accessibility pattern | DCR | Add new focus-management rule | May be expedited when blocking access |
| Bug fix with no architecture or visual impact | Standard engineering process | Fix a validation bug | Must not change behavior scope |
| Internal refactor with no behavior or visual impact | Standard engineering process | Improve code structure | Must preserve tests and public behavior |
| Performance optimization with no behavior or visual impact | Standard engineering process | Reduce render cost | Must not alter workflow or UI semantics |
| Test-only change | Standard engineering process | Add coverage for existing component | Must not encode new requirements |
| Documentation correction with no governance meaning change | Documentation process | Fix typo or broken link | If meaning changes, use ACR or DCR as applicable |

## Combined ACR and DCR Cases

Some changes require both paths.

Use both ACR and DCR when a change affects architecture and visual design.

Examples:

- A new workflow page that needs a new component family.
- A new authoritative state that needs a new badge pattern.
- A new AI decision-support workflow with new recommendation UI.
- A new financial lifecycle state with new invoice or payment UI.
- A new privacy boundary that requires new disclosure components.

Order:

```text
ACR
↓
Architecture Review
↓
Architecture Approval
↓
DCR
↓
Design Review
↓
Design Approval
↓
Implementation
↓
Validation
↓
Freeze
```

## Pre-Implementation Verification

Every implementation task must begin with this checklist:

```text
Pre-Implementation Verification

□ Architecture already approved?
□ Design already approved?
□ ACR required?
□ DCR required?
□ Existing component available?
□ Existing workflow available?
□ Existing design token available?
□ Source-of-truth boundary clear?
□ Privacy boundary clear?
□ Security boundary clear?
□ AI boundary clear?
□ Accessibility requirement clear?

If any answer blocks certainty:

STOP

Owner approval required.
```

## Standard Engineering Path

The standard engineering process may be used only when all of the following are true:

- No page responsibility changes.
- No workflow changes.
- No state-machine changes.
- No data model changes.
- No API contract changes.
- No permission changes.
- No privacy boundary changes.
- No AI authority changes.
- No component or token changes.
- No visual hierarchy changes.
- No accessibility pattern changes.

If any item is false, use ACR, DCR, or both.

## Validation Requirements

Every completed change must validate:

- Approved governance path was followed.
- Architecture boundaries remain intact.
- Design-system boundaries remain intact.
- Privacy and security boundaries remain intact.
- AI remains within approved authority.
- Accessibility was not weakened.
- Tests or review evidence match the change type.
- No unapproved adjacent workflow was modified.

## Final Rule

When in doubt, stop before implementation and classify the request.

Do not guess whether a change is architecture, design-system, or standard engineering work.
