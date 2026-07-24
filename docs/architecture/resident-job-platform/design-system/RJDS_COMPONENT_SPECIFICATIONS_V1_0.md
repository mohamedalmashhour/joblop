# RJDS Component Specifications v1.0

Status: Approved baseline

## 1. Component Governance

All components must support accessibility, privacy, auditability, and source-of-truth boundaries. A component may display a workflow state only if the page owns or is allowed to reference that state.

Do not create a new component family if an approved family can express the need through an authorized variant.

## 2. App Shell

Purpose: Provide stable navigation, role context, account access, and page-level orientation.

Required elements:

- Product or portal identity.
- Role or workspace label.
- Primary navigation.
- Current page indicator.
- Account menu.
- Support path where appropriate.

States:

- Signed out.
- Signed in.
- Restricted.
- Partial access.
- Loading workspace.

Accessibility:

- Skip link.
- Landmark regions.
- Keyboard navigable menus.
- Clear active page state.

Boundary:

- Shell navigation must not execute governed workflow decisions.

## 3. Buttons and Actions

Variants:

- Primary action.
- Secondary action.
- Tertiary text action.
- Destructive action.
- Governed handoff action.
- Disabled or unavailable action.

Rules:

- Primary actions must be reserved for the page's main approved workflow.
- Destructive actions require explicit wording and confirmation where risk exists.
- Disabled actions must explain why they are unavailable.
- Icon-only buttons require accessible names and tooltips where meaning is not universal.

Boundary:

- A button must not imply final approval if the action is only a request, draft, recommendation, or handoff.

## 4. Forms

Purpose: Collect task-specific information.

Required elements:

- Field label.
- Input or selector.
- Helper text where needed.
- Validation message.
- Required/optional indication.
- Privacy note when sensitive information is collected.

Rules:

- Do not ask for information already owned by another workflow unless the approved page requires confirmation.
- Validation should be plain language.
- Sensitive fields must mask values where appropriate.
- Consent should not bundle unrelated approvals.

## 5. Status Badges

Purpose: Communicate workflow state compactly.

Approved pattern:

- Status label.
- Semantic color.
- Optional icon.
- Optional supporting metadata.

Rules:

- Never merge independent statuses into one badge when governance requires separation.
- Use "Pending", "Under review", "Restricted", "Unavailable", "Approved", "Confirmed", and "Failed" consistently with the owning workflow.
- Status badges are indicators, not buttons, unless explicitly designed as filters.

## 6. Capsules and Chips

Purpose: Express selectable groups, job families, specialties, filters, skills, experience tags, and source labels.

Required behavior:

- Selected state.
- Unselected state.
- Keyboard selection.
- Clear accessible name.
- Wrap gracefully on mobile.

Worker and employer job capsules must support:

- Main group.
- Narrow specialty.
- Experience or service detail.
- Free-entry learning capsule where approved.

Boundary:

- Selecting a capsule filters or describes need. It must not approve eligibility, guarantee work, or create a job classification without governance.

## 7. Cards and Panels

Purpose: Group related information without creating false authority.

Approved card types:

- Task card.
- Status card.
- Recommendation card.
- Evidence card.
- Financial summary card.
- Governance metadata card.
- Alert card.

Rules:

- Do not place cards inside cards.
- Do not give equal weight to primary, secondary, and tertiary dashboard items.
- The card title must identify the governed concept.
- Metadata must identify freshness, source, or limitation where needed.

## 8. Dashboard Widgets

Purpose: Summarize operational attention areas.

Required elements:

- Widget title.
- Source or scope.
- Current state.
- Last updated or freshness where relevant.
- Primary navigation or handoff.

Priority:

- Primary widgets answer immediate action.
- Secondary widgets support planning.
- Tertiary widgets provide context.

Boundary:

- Dashboard widgets summarize and navigate. They are not source-of-truth editors unless the approved page owns that workflow.

## 9. Tables and Lists

Purpose: Support scanning, filtering, sorting, and navigation.

Required columns or fields:

- Human-readable name or reference.
- Status.
- Owner or scope where relevant.
- Last updated or time reference where relevant.
- Next action or governed handoff.

Rules:

- Tables must have empty, loading, partial, stale, restricted, and error states where relevant.
- Columns showing sensitive information must be masked or omitted.
- Sorting and filtering must not produce discriminatory or hidden ranking unless explicitly governed.

## 10. Calendars

Purpose: Display availability, shifts, scheduled work, holds, and time-based operational context.

Required elements:

- Date range.
- Time zone or locality guidance where relevant.
- Status legend.
- Event type distinction.
- Conflict indication.
- Empty day treatment.

Rules:

- Availability does not equal eligibility.
- Calendar hold does not equal confirmed assignment.
- Scheduled time does not equal actual attendance.
- Calendar UI must not calculate payroll.

## 11. AI Advisory Panel

Purpose: Show AI recommendations, summaries, missing information, confidence guidance, and evidence.

Required elements:

- AI label.
- Recommendation or summary.
- Evidence.
- Missing information.
- Confidence guidance.
- Human review action or navigation.
- Prohibited action reminder where risk exists.

Rules:

- AI panels must look advisory, not authoritative.
- Do not present AI output as final decision.
- Do not hide the human approval path.
- Do not fabricate live model metrics.

## 12. Financial Components

Approved components:

- Estimate panel.
- Authorization panel.
- Invoice status.
- Payment lifecycle timeline.
- Worker payable summary.
- Masked destination.
- Exception or hold panel.

Rules:

- Estimate does not equal final invoice.
- Authorization does not equal payment.
- Payroll approved does not equal paid.
- Sent does not equal settled.
- Settled does not equal irreversible.

## 13. Evidence and Audit Components

Purpose: Preserve reviewability.

Required fields where applicable:

- Actor.
- Role.
- Timestamp.
- Action.
- Source.
- Reason.
- Original value.
- New value.
- Reviewer.
- Outcome.

Rules:

- Audit entries cannot be edited, deleted, or replayed from display components.
- Evidence display must not expose restricted material.

## 14. Messaging and Support Components

Purpose: Enable communication without turning messages into workflow authority.

Rules:

- Messages do not approve operational actions.
- Support cases do not alter authoritative state without a governed workflow.
- Attachments require governance, masking, and file-state clarity.
- AI may summarize or draft for review but must not send autonomously.

## 15. Empty, Error, and Restricted States

Every state component must include:

- Plain-language title.
- What happened.
- What the user can do.
- Support or navigation path where appropriate.

Do not reveal whether a hidden or restricted record exists when doing so would create privacy or security risk.
