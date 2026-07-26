# Page 022 - Availability Calendar Product Design Review

Status: Complete - owner review required
Epic: Epic 3 - Worker Portal
Page: 022 - Availability Calendar
Reviewed artifact: PAGE_022_AVAILABILITY_CALENDAR_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

Page 022 defines the authenticated worker availability-management experience while preserving the
distinction between availability, preferences, assignments, acceptance, attendance, and payroll.

The page is suitable for owner review. It does not assign shifts, guarantee work, calculate payroll,
override accepted commitments, expose employer-only scheduling controls, or allow AI to change
availability without worker confirmation.

Recommendation: APPROVE FOR OWNER REVIEW.

No approval record has been created because the owner review gate remains active.

## 2. Strengths

- Availability, preferences, assignments, acceptance, and attendance remain separate.
- General availability, one-time availability, unavailability, commitments, and preferences are
  distinct.
- Accepted assignments are visibly protected from silent overwrite.
- Recurring availability and one-time exceptions have clear scopes.
- Hard availability boundaries and soft preferences are separated.
- Timezone, location, daylight-saving, and overnight-shift concerns are visible.
- Employer visibility is restricted to operational availability facts.
- Private reasons and personal calendar details stay private by default.
- External calendar sync is treated as a future placeholder only.
- AI boundaries prevent automatic availability edits, assignment decisions, and protected-characteristic ranking.

## 3. Weaknesses

- Real recurrence logic requires future engineering design.
- External calendar sync requires future owner-approved integration design.
- Employer visibility rules require future permission implementation.
- Offline editing and sync conflict resolution require future technical design.

These are not Page 022 wireframe defects.

## 4. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Availability appears to guarantee work | High | Core boundary states availability is not guaranteed work. |
| Availability edit cancels accepted assignment | High | Accepted-shift lock and cancellation-workflow reference are explicit. |
| Soft preference appears as hard restriction | High | Hard boundary vs soft preference table separates them. |
| Private reasons are exposed | High | Employer visibility and privacy section keeps reasons worker-only. |
| Overnight availability is ambiguous | Medium | Cross-midnight block shows start and next-day end. |
| Timezone is unclear | High | Worker and assignment timezone handling is visible. |
| External calendar appears connected | Medium | Placeholder states say no provider is active. |
| AI changes availability or commitments | High | AI cannot change without confirmation or cancel/accept/reject assignments. |
| Employers receive personal scheduling data | High | Employer visibility is operational-only. |

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Availability/preference separation | 9.9 | Strong separation between hard boundaries and soft preferences. |
| Availability/assignment separation | 10.0 | Accepted commitments are protected. |
| Recurring-pattern clarity | 9.7 | Recurring inputs and save review are clear at wireframe level. |
| Exception handling | 9.8 | One-time, future, full-pattern, and restore paths are visible. |
| Accepted-assignment protection | 10.0 | Availability edits cannot silently cancel shifts. |
| Conflict detection | 9.8 | Conflicts are advisory and do not auto-alter commitments. |
| Timezone clarity | 9.8 | Worker, assignment, daylight-saving, and overnight states are covered. |
| Overnight-shift handling | 9.8 | Cross-midnight boundaries are explicit. |
| Privacy | 9.8 | Private reasons and calendar details are protected. |
| Employer visibility | 9.8 | Employer sees operational availability only. |
| External-calendar boundary | 9.7 | Future concept is acknowledged without implying active integration. |
| AI boundaries | 10.0 | AI cannot modify availability, commitments, or assignment decisions. |
| Mobile usability | 9.7 | Mobile prioritizes agenda, quick edits, conflicts, and timezone. |
| Accessibility | 9.7 | Calendar, recurrence, status, focus, and errors are covered. |
| International readiness | 9.8 | Locale, timezone, week start, DST, holidays, and rules remain configurable. |
| Consistency with Pages 016-021 | 9.8 | Preserves worker dashboard, profile, compliance, and background-check boundaries. |
| Overall | 9.8 | Ready for owner review. |

## 6. Review Criteria

### Availability Versus Preference Separation

Pass.

The page distinguishes hard boundaries from soft preferences and clarifies that preferences guide
matching without automatically blocking all offers.

### Availability Versus Assignment Separation

Pass.

Available does not mean assigned. Assigned does not mean accepted. Accepted does not mean attended.
Changing availability does not cancel an accepted assignment.

### Recurring Pattern Clarity

Pass.

The wireframe includes selected weekdays, weekends, alternating weeks, date range, time blocks,
timezone, and location/travel boundary placeholders without defining implementation logic.

### Exception Handling

Pass.

Workers can add one-time availability, block a date, change hours, mark part of a day unavailable,
override one occurrence, restore recurring pattern, and choose whether a change applies to one
occurrence, future occurrences, or the full pattern.

### Accepted Assignment Protection

Pass.

Accepted or confirmed assignments are locked from silent overwrite and redirect to the proper
change/cancellation workflow.

### Conflict Detection

Pass.

Conflict detection is advisory. It may identify overlaps, accepted-assignment conflicts, leave
conflicts, overnight overlaps, timezone inconsistency, and duplicate exceptions, but it does not
automatically cancel or alter commitments.

### Timezone and Overnight Shifts

Pass.

Worker timezone, assignment timezone, daylight-saving changes, and overnight 22:00 to 06:00
cross-midnight blocks are represented.

### Privacy and Employer Visibility

Pass.

Employers see only operational availability needed for staffing. Private reasons, personal calendar
details, medical information, private notes, unrelated commitments, and exact personal-event
descriptions remain private by default.

### External Calendar Boundary

Pass.

The page may acknowledge future external calendar sync but does not design or imply live
integration with Google, Apple, Outlook, or any other provider.

### AI Boundaries

Pass.

AI can suggest recurring patterns, detect conflicts, suggest gaps, explain schedule states,
recommend updates after repeated declines, and help format recurring schedules. AI cannot change
availability without confirmation, accept/reject assignments, cancel accepted shifts, infer private
reasons, expose personal calendar details, guarantee work, determine employment eligibility,
penalize limited availability, or rank workers using protected characteristics.

## 7. Required Improvements

No required wireframe improvements are identified at this review stage.

Owner review is still required before Page 022 may become Approved Wireframe v1.0.

## 8. Non-Blocking Design Debt

Potential future enhancements:

- Rich external calendar integration after owner-approved connector design.
- Drag-and-drop desktop calendar editing after interaction-pattern approval.
- Bulk recurring-pattern editor after implementation planning.
- Worker preference analytics after AI governance review.
- Travel-time availability suggestions after location and privacy model approval.

These are not blockers for Page 022.

## 9. Confirmation

- Architecture Freeze remains intact.
- Page 022 remains Availability Calendar.
- Epic 3 Planning remains unchanged.
- Pages 016-021 remain unchanged.
- No implementation started.
- No Page 023 files created.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No calendar integration created.
- Unrelated app changes remain untouched.
- No deployment performed.
- No production data introduced.

## 10. Owner Decision Required

Valid next owner decisions:

- APPROVE PAGE 022 AS APPROVED WIREFRAME v1.0.
- APPROVE WITH DOCUMENTED CONDITIONS.
- REMEDIATION REQUIRED.

Page 023 remains blocked until Page 022 reaches Approved Wireframe v1.0.
