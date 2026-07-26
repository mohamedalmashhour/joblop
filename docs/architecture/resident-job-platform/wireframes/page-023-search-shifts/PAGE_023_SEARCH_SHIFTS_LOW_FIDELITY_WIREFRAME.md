# Page 023 - Search Shifts Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Frozen architecture source: pages/PAGE_023_SEARCH_SHIFTS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 022 | Availability Calendar | pages/PAGE_022_AVAILABILITY_CALENDAR.md |
| 023 | Search Shifts | pages/PAGE_023_SEARCH_SHIFTS.md |
| 024 | Shift Details | pages/PAGE_024_SHIFT_DETAILS.md |

Page 023 purpose from the frozen architecture:

> The Search Shifts page exists to help verified workers discover, review, and apply for appropriate shifts.

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Search Shifts helps an authenticated worker discover open shift opportunities appropriate to their worker status, role groups, availability, location context, credentials where applicable, and approved business rules.

The page must feel like an operational workforce surface, not a generic job board.

The page must clearly distinguish:

```text
Recommended shift
does not equal
Assigned shift

Available shift
does not equal
Eligible shift

Eligible to apply
does not equal
Accepted shift

Accepted shift
does not equal
Active shift

Worked shift
does not equal
Paid shift
```

## 3. Primary User Goals

Workers need to:

- Find shifts that match their role groups and availability.
- Understand which shifts are open, recommended, blocked, filled, or already applied to.
- See key operational details before opening the full Shift Details page.
- Understand why a shift is or is not actionable.
- Apply only when the shift is open and the worker is permitted to apply.
- Avoid confusing AI recommendations with confirmed work.
- Avoid confusing availability with assignment.
- Preserve privacy while seeing enough information to make an informed decision.

## 4. Information Ownership

Page 023 owns shift discovery and search interaction.

It does not own:

- Worker identity.
- Professional information.
- License review.
- Certification review.
- Background-check review.
- Availability editing.
- Assignment confirmation.
- Attendance.
- Timesheet approval.
- Payroll or final payment.
- Employer billing.

## 5. Required State Model

Each shift card must show a clear state.

| State | Meaning | Worker action |
| --- | --- | --- |
| Recommended | The platform or AI suggests review based on available evidence. | Review details. |
| Open to apply | The shift appears open and may accept applications. | Review details or apply. |
| Already applied | Worker has submitted an application. | View status. |
| Awaiting review | Application or eligibility review is pending. | Wait or contact support if needed. |
| Accepted | Worker has accepted or been confirmed through the approved flow. | View accepted shift. |
| Not eligible | One or more requirements are not currently satisfied or cannot be confirmed. | Review explanation and next steps. |
| Filled | Shift is no longer available. | No application action. |
| Closed | Shift is no longer accepting action. | No application action. |

No state may imply guaranteed assignment, guaranteed coverage, guaranteed pay, or automatic approval.

## 6. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Search Shifts           Profile Help │
│ Worker: [Name]                       Worker Portal                 Alerts │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DISCOVERY BOUNDARY NOTICE                                                  │
│ Search results are opportunities for review. Recommendations are not       │
│ assignments. Applying does not guarantee selection. Assignment is confirmed │
│ only through the approved shift workflow.                                  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORKER READINESS SUMMARY - EXPLANATORY ONLY                                │
├──────────────────────┬──────────────────────┬──────────────────────────────┤
│ Availability today   │ Profile status       │ Review items                 │
│ Available after 15:00│ Mostly complete      │ 1 credential reminder        │
├──────────────────────┼──────────────────────┼──────────────────────────────┤
│ Role groups          │ Location range       │ Current assignment status    │
│ Kitchen, helper      │ 20 km preference     │ No active shift              │
└──────────────────────┴──────────────────────┴──────────────────────────────┘
│ Readiness helps explain search results. It is not a universal eligibility  │
│ badge and does not guarantee assignment.                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SEARCH AND FILTERS                                                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Search                       │ [Role, residence, city, keyword]            │
│ Date                         │ [Today] [Tomorrow] [This week] [Custom]     │
│ Role group                   │ [Kitchen] [Care] [Housekeeping] [Maint.]    │
│ Shift time                   │ [Morning] [Evening] [Night] [Weekend]       │
│ Distance                     │ [Within preferred range] [Show more]        │
│ Status                       │ [Recommended] [Open] [Applied] [Blocked]    │
│ Requirements                 │ [Matches current profile] [Show gaps]       │
│ Data label                   │ [Live / Pending / Demo if applicable]       │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ RESULTS SUMMARY                                                            │
│ 12 shifts found | 4 recommended | 2 require review | 1 already applied     │
│ Sort: [Recommended] [Soonest] [Distance] [Role] [Updated recently]         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT RESULTS                                                              │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ SHIFT CARD                           │ WHY THIS APPEARS                    │
│ Kitchen Cook                         │ Status: Recommended                 │
│ Residence: [Area / permitted name]   │ Evidence: role group match          │
│ Date: Today                          │ Availability: after 15:00 matches   │
│ Time: 16:00-22:00                    │ Distance: within preference         │
│ Department: Kitchen                  │ Requirements: 3 matched, 1 pending  │
│ Estimated worker earnings: shown if  │ AI: Recommendation only             │
│ approved for this worker             │ Human confirmation required         │
│ State: Open to apply                 │                                     │
│ [Review details] [Apply]             │                                     │
├──────────────────────────────────────┼─────────────────────────────────────┤
│ SHIFT CARD                           │ WHY THIS APPEARS                    │
│ Dietary Aide                         │ Status: Not eligible today          │
│ Date: Tomorrow                       │ Reason: required item pending       │
│ Time: 07:00-15:00                    │ Next step: review profile task      │
│ State: Not eligible                  │ AI: May explain gap only            │
│ [Review details] [View requirement]  │ Apply action unavailable            │
├──────────────────────────────────────┼─────────────────────────────────────┤
│ SHIFT CARD                           │ WHY THIS APPEARS                    │
│ Kitchen Helper                       │ Status: Already applied             │
│ Date: Friday                         │ Application: awaiting review        │
│ Time: 11:00-19:00                    │ Assignment not confirmed            │
│ State: Already applied               │                                     │
│ [View application status]            │                                     │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLY ACTION SAFETY                                                        │
│ Before applying, the worker must review full shift details, requirements,  │
│ location context, timing, earnings information where approved, and support │
│ guidance. Application is recorded and may require human or operational     │
│ review.                                                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI RECOMMENDATIONS                                                         │
│ AI may recommend shifts, explain matching evidence, and identify possible  │
│ conflicts. AI does not assign work, approve eligibility, accept shifts,    │
│ approve attendance, approve timesheets, or calculate final payment.        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND VISIBILITY                                                     │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE           │ PLATFORM ONLY    │
│ Private preferences        │ Application status relevant│ Audit events     │
│ Full search history        │ to that employer/shift     │ Matching evidence│
│ Non-shared blockers        │ Assignment-relevant facts  │ Internal reviews │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ Employers do not receive unrestricted worker profile access from search.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPTY / ERROR / RESTRICTED STATES                                          │
│ Empty: No matching shifts found. Try changing filters or updating          │
│ availability.                                                              │
│ Restricted: Account or review status limits search actions.                │
│ Error: Shifts cannot be loaded right now. Retry or contact support.        │
│ Offline: Recent saved shift list may be visible, but applying requires     │
│ connectivity.                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

## 7. Mobile Wireframe

Mobile must prioritize actionability and status clarity.

```text
┌──────────────────────────────┐
│ Search Shifts          Help  │
│ Worker Portal                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ DISCOVERY NOTICE             │
│ Recommendations are not      │
│ assignments. Apply only after│
│ reviewing details.           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ READINESS SUMMARY            │
│ Available after 15:00        │
│ Kitchen group                │
│ 1 review item                │
│ Not a guarantee of work      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FILTERS                      │
│ [Today] [This week]          │
│ [Kitchen] [Distance]         │
│ [Recommended] [Open]         │
│ [More filters]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ RESULTS                      │
│ 12 found | 4 recommended     │
│ Sort: Recommended            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Kitchen Cook                 │
│ Today | 16:00-22:00          │
│ State: Open to apply         │
│ Why: role + availability     │
│ AI: suggestion only          │
│ [Review details] [Apply]     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Dietary Aide                 │
│ Tomorrow | 07:00-15:00       │
│ State: Not eligible today    │
│ Reason: item pending         │
│ [Review details]             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Kitchen Helper               │
│ Friday | 11:00-19:00         │
│ State: Already applied       │
│ Assignment not confirmed     │
│ [View status]                │
└──────────────────────────────┘
```

Mobile interaction requirements:

- Keep filter chips compact and scrollable.
- Use 44px minimum touch targets.
- Do not rely on color alone for shift state.
- Keep the first actionable result visible quickly.
- Avoid dense tables.
- Keep "recommendation only" language visible on recommended cards.

## 8. Navigation Behavior

Worker navigation:

```text
Worker Dashboard
↓
Search Shifts
↓
Shift Details
↓
Apply
↓
Application / accepted-shift flow where applicable
```

Secondary navigation:

- Availability Calendar for updating worker availability.
- My Profile for worker profile gaps.
- Licenses / Certifications / Background Check for requirement gaps.
- Support for issues that prevent action.

Page 023 must not bypass Page 024 Shift Details when the worker needs full operational context.

## 9. Status and Eligibility Clarity

Search results may include explanations, but must avoid unsupported conclusions.

Allowed labels:

- Recommended.
- Open to apply.
- Already applied.
- Awaiting review.
- Accepted.
- Not eligible today.
- Requirement pending.
- Filled.
- Closed.

Avoid labels that imply unsupported certainty:

- Guaranteed match.
- Approved for all roles.
- Fully verified worker.
- Automatically assigned.
- Payment confirmed.
- Hired.

## 10. Employer Visibility

Search Shifts is worker-facing.

Employers may later see only:

- application status relevant to their own shift;
- assignment-relevant profile or requirement summaries;
- information permitted by approved workflow and permissions.

Employers must not see:

- full worker search history;
- private worker preferences;
- unrelated profile details;
- unrelated license or certification records;
- full background-check content;
- platform-only matching evidence;
- other employer interactions.

## 11. AI Boundaries

AI may:

- recommend shifts based on approved evidence;
- explain why a shift appears;
- identify possible requirement gaps;
- identify possible schedule conflicts;
- suggest filter adjustments;
- suggest reminders.

AI must not:

- assign a shift;
- apply for a shift on behalf of the worker;
- approve worker eligibility;
- verify credentials;
- verify identity;
- override availability;
- approve attendance;
- approve timesheets;
- calculate final payment;
- expose protected worker or employer data.

Every AI output must be visibly labeled as a recommendation or explanation.

## 12. Empty States

### No Matching Shifts

Message:

```text
No matching shifts are available with the current filters.
```

Actions:

- Adjust filters.
- Update availability.
- Review profile status.
- Turn on notifications for matching shifts.

Do not imply work is guaranteed if filters are changed.

### No Shifts Because Account Restricted

Message:

```text
Your account status limits shift search actions right now.
```

Actions:

- Review account status.
- Contact support.

Do not expose internal review reasons beyond approved user-facing status.

## 13. Loading States

Loading states:

- Search results loading.
- Filters loading.
- Recommendation evidence loading.
- Application status loading.

Loading state must not show stale recommendations as confirmed.

## 14. Error States

Error states:

- Unable to load shifts.
- Unable to update filters.
- Unable to load recommendation evidence.
- Unable to submit application.
- Connection issue.
- Permission or account-state issue.

Errors must explain what happened and what the worker can do next without exposing internal implementation details.

## 15. Success States

Possible success states:

- Filters updated.
- Saved search updated.
- Notification preference saved.
- Application submitted.

Application-submitted success must state:

```text
Application submitted. This is not an assignment confirmation.
```

## 16. Accessibility

Accessibility requirements:

- Keyboard-accessible filters and cards.
- Screen-reader labels for shift state, recommendation status, and action availability.
- No color-only state indicators.
- Clear focus order from filters to results to action area.
- Descriptive button labels.
- Error messages associated with affected controls.
- Mobile touch targets of at least 44px.
- Plain-language explanations for blocked actions.

## 17. International Readiness

The wireframe must not hardcode:

- one country's employment model;
- country-specific credentials;
- fixed emergency numbers;
- tax or payroll rules;
- specific legal rights;
- fixed currency behavior;
- country-specific background-check requirements.

Location, jurisdiction, currency, language, and date/time formatting remain future configurable behavior.

## 18. Data Honesty

Required data labels:

- Live where connected to real source.
- Pending where waiting for review or confirmation.
- Estimated where informational only.
- Demo where sample data is used.

The page must not present fake or fabricated production availability, staffing, earnings, or employer data.

## 19. Self Validation

| Requirement | Status |
| --- | --- |
| Exact frozen Page 023 title used | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-022 unchanged | Pass |
| Worker Portal boundaries preserved | Pass |
| AI limits explicit | Pass |
| Privacy boundaries explicit | Pass |
| Employer visibility limited | Pass |
| Recommendation does not equal assignment | Pass |
| Availability does not equal eligibility | Pass |
| Application does not equal assignment | Pass |
| Mobile-first behavior included | Pass |
| Accessibility included | Pass |
| International readiness included | Pass |
| No Page 024 files created | Pass |
| No implementation started | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| Unrelated app changes untouched | Pass |

## 20. Final Page Status

```text
Page 023 - Search Shifts
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 024
BLOCKED
```
