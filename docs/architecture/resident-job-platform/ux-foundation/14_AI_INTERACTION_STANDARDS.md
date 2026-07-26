# AI Interaction Standards

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define how AI appears and behaves across Resident Job.

## Standards

- AI is labeled as advisor.
- AI recommendations show evidence chips.
- AI must state missing information when evidence is incomplete.
- AI cannot complete protected actions.
- Human approval is visually central.
- AI output is never treated as audit truth unless accepted by a human and recorded.

## Allowed

- Summarize requests.
- Detect missing information.
- Recommend candidate workers.
- Flag compliance risks.
- Suggest dispatch options.
- Draft messages for approval.

## Forbidden

- Autonomous worker assignment.
- Autonomous payment or payroll action.
- Autonomous compliance exception.
- Autonomous client communication without approval.
- Changing its own permissions.

## U X Rules

- Use recommendation cards, not command buttons.
- Show confidence only with supporting evidence.
- Use 'Approve', 'Reject', and 'Request more info' actions for humans.
- Record AI recommendation ID in the audit event when used.
