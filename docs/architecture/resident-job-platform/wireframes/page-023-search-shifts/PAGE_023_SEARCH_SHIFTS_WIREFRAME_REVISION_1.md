# Page 023 - Search Shifts Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_023_SEARCH_SHIFTS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens search and discovery clarity, eligibility transparency, shift
suitability, compensation transparency, employer visibility, application boundaries, AI matching
governance, and mobile usability.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-022.
- EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Discovery, Suitability, Eligibility, and Application

Every shift result must expose four independent concepts.

| Layer | Meaning | Examples |
| --- | --- | --- |
| Discoverable | The shift is visible in search. | Visible, hidden by filter, closed, stale. |
| Potentially suitable | The shift appears relevant based on worker-entered preferences, role, location, and availability. | Role match, availability match, travel match, preference mismatch. |
| Eligibility status | Known requirements and review state for this specific shift. | Eligible based on currently known requirements, potential requirement gap, further review needed, eligibility unknown, not eligible for this shift. |
| Application state | The worker's current action state for this opportunity. | Not applied, draft application, applied, withdrawn, employer reviewing, closed, filled, cancelled. |

Required boundary language:

```text
Visible in search
does not equal
Suitable

Suitable
does not equal
Eligible

Eligible
does not equal
Guaranteed acceptance

Applied
does not equal
Assigned

Assigned
does not equal
Accepted

Accepted
does not equal
Worked
```

## 3. Verified Worker Boundary

The frozen architecture says the page helps verified workers discover and apply for appropriate
shifts. In this context, "verified worker" means the worker has enough approved account access to
use the worker portal and search for opportunities according to the platform's rules.

It does not mean universal readiness for every shift.

Workers may have separate states for:

- Identity.
- Professional information.
- Licences.
- Certifications.
- Background check.
- Availability.
- Worker approval.

Specific shift eligibility depends only on the requirements relevant to that shift. Verified
identity alone does not allow application to every shift.

No single "verified worker" badge may be used as proof of universal readiness.

## 4. Revised Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Search Shifts           Profile Help │
│ Worker: [Name]                       Worker Portal                 Alerts │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SEARCH BOUNDARY NOTICE                                                     │
│ Search shows opportunities for review. Visible ≠ suitable. Suitable ≠      │
│ eligible. Applying ≠ assigned. Assignment and acceptance follow the         │
│ approved shift workflow.                                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ VERIFIED WORKER CONTEXT - NOT UNIVERSAL ELIGIBILITY                        │
├────────────────────┬────────────────────┬─────────────────────────────────┤
│ Account access     │ Worker approval    │ Shift-specific checks           │
│ Active             │ Approved / pending │ Role, licence, certification,   │
│                    │ where applicable   │ background-check, availability  │
├────────────────────┼────────────────────┼─────────────────────────────────┤
│ Availability source│ Profile source     │ Compliance source               │
│ Page 022           │ Pages 017-018      │ Pages 019-021                   │
└────────────────────┴────────────────────┴─────────────────────────────────┘
│ This summary explains search access only. Each shift may have its own      │
│ requirements and review state.                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SEARCH AND FILTERS                                                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Search                       │ [Role, residence, city, keyword]            │
│ Role / department            │ [Kitchen] [Care] [Housekeeping] [Maint.]    │
│ Date / time                  │ [Today] [This week] [Morning] [Night]       │
│ Location / travel            │ [Distance] [Travel time] [Region]           │
│ Compensation                 │ [Range] [Premiums] [Travel allowance]       │
│ Duration                     │ [Short] [Full day] [Overnight] [Recurring]  │
│ Urgency                      │ [Urgent] [Same-day] [Standard]              │
│ Requirements                 │ [Matches known requirements] [Show gaps]    │
│ Application status           │ [Not applied] [Applied] [Reviewing]         │
│ Sorting                      │ Hard filters separate from preferences      │
│ Preference sort              │ [Recommended] [Soonest] [Distance] [Pay]    │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Hard filters remove results by worker choice. Preference sorting changes   │
│ order only and must not silently hide shifts.                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ RESULTS SUMMARY                                                            │
│ 12 visible | 4 potentially suitable | 2 requirement gaps | 1 applied       │
│ Alerts: 1 stale result warning | 1 same-day response deadline              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT RESULT CARD                                                          │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ ROLE AND OPERATIONS                  │ STATUS LAYERS                       │
│ Role: Kitchen Cook                   │ Discoverable: Yes                   │
│ Employer/residence: [Approved name]  │ Suitability: Good role match        │
│ Residence type: [Type placeholder]   │ Eligibility: Eligible based on      │
│ Location: [General area]             │ currently known requirements        │
│ Date: [Date]                         │ Application: Not applied            │
│ Time: 16:00-22:00                    │                                     │
│ Timezone: [Shown]                    │ WHY RECOMMENDED                     │
│ Duration: 6 hours                    │ Matches selected role, availability,│
│ Overnight: No                        │ and chosen travel distance.         │
│ Urgency: Same-day                    │ AI: explanation only.               │
│ Deadline: Respond by [time]          │                                     │
├──────────────────────────────────────┼─────────────────────────────────────┤
│ COMPENSATION                         │ REQUIREMENTS                        │
│ Worker pay rate: [Known/estimated]   │ Required qualifications: [Summary]  │
│ Shift premium: [If approved]         │ Licence: satisfied / not relevant   │
│ Urgent premium: [If approved]        │ Certification: satisfied / pending  │
│ Travel compensation: [If approved]   │ Background check: status summary    │
│ Transportation allowance: [If any]   │ only, no sensitive details          │
│ Expense reimbursement: [If any]      │ Availability: available / conflict  │
│ Estimated gross: [Amount if known]   │                                     │
│ Estimate ≠ guaranteed final pay.     │ [Review details] [Begin application]│
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT RESULT CARD - REQUIREMENT GAP                                        │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Role: Dietary Aide                   │ Discoverable: Yes                   │
│ Date/time: Tomorrow, 07:00-15:00     │ Suitability: Role preference match  │
│ Location: [General area]             │ Eligibility: Potential requirement │
│ Compensation: Estimate unavailable   │ gap                                 │
│ Application state: Not applied       │ Gap: certification expired          │
│                                      │ Action: [Renew certification]       │
│                                      │ [Review details]                    │
│ Search page shows only the safe summary. Full details stay in the owning   │
│ worker page or Page 024 Shift Details.                                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION BOUNDARY                                                       │
│ Safest flow: Search result → Shift Details → Review requirements → Apply.  │
│ Quick apply may appear only when requirements are already satisfied and     │
│ the approved flow permits it. Applying submits interest/application only;  │
│ it does not assign, accept, or guarantee employer review.                  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AFTER APPLY                                                                │
│ Application submitted → Awaiting review / employer or platform workflow → │
│ Worker acceptance or assignment confirmation where applicable.             │
│ Application submitted ≠ assignment confirmed.                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ URGENT AND SAME-DAY SAFETY                                                 │
│ Urgent shifts show start time, response deadline, location, travel impact, │
│ qualification requirements, approved premiums, cancellation expectations,  │
│ and availability conflicts. Urgency never bypasses consent, qualification  │
│ checks, availability review, shift-detail review, or safety information.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SAVED SEARCHES AND ALERTS                                                  │
│ [Save this search] [Alert frequency] [Channel preference] [Pause] [Delete]│
│ Alerts require explicit confirmation. Alert ≠ guaranteed availability.     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND VISIBILITY                                                     │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE AFTER     │ PLATFORM ONLY    │
│ Saved searches             │ APPROVED WORKFLOW          │ Matching evidence│
│ Private preferences        │ Relevant qualifications    │ Audit events     │
│ Search history             │ Application information    │ Internal reviews │
│ Viewed shifts              │ Operational availability   │ Risk flags       │
│ Private location prefs     │ Approved profile summary   │                  │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ The search page never exposes exact live worker location or private search │
│ behavior to employers.                                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe Revision

Mobile cards must remain compact while preserving the four independent state layers.

```text
┌──────────────────────────────┐
│ Search Shifts          Help  │
│ Worker Portal                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SEARCH NOTICE                │
│ Visible ≠ suitable           │
│ Suitable ≠ eligible          │
│ Applied ≠ assigned           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FILTERS                      │
│ [Role] [Date] [Distance]     │
│ [Pay] [Urgent] [Status]      │
│ [Reset] [More filters]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 12 visible | 4 suitable      │
│ Sort: Recommended because... │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Kitchen Cook                 │
│ Today 16:00-22:00            │
│ Area: [General location]     │
│ Pay: worker rate + approved  │
│ premiums where known         │
│                              │
│ Discoverable: Yes            │
│ Suitable: Good match         │
│ Eligibility: Known reqs met  │
│ Application: Not applied     │
│                              │
│ Why: role + availability     │
│ AI: explanation only         │
│ [Details] [Begin apply]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Dietary Aide                 │
│ Tomorrow 07:00-15:00         │
│ Eligibility: Gap             │
│ Safe summary: certification  │
│ needs review                 │
│ [Details] [Review requirement]│
└──────────────────────────────┘

┌──────────────────────────────┐
│ OFFLINE / STALE RESULTS      │
│ Saved results may be old.    │
│ Applying requires live       │
│ connection and current shift │
│ availability.                │
└──────────────────────────────┘
```

Mobile requirements:

- Visible role, date, time, location, and worker compensation summary.
- Clear eligibility state.
- Accessible bottom-sheet filters where appropriate.
- Large touch targets.
- Filter reset.
- Visible result count.
- Urgent shifts visually distinct without pressure tactics.
- Avoid excessive badges or dense cards.

## 6. Compensation Transparency

Worker-facing compensation must be truthful and separated from employer billing.

Where known and approved, show:

- Worker pay rate.
- Shift premium.
- Urgent-shift premium.
- Travel compensation.
- Transportation allowance.
- Expense reimbursement.
- Estimated gross amount.
- Deductions or payroll treatment only where approved and known.

Required distinctions:

```text
Displayed estimate
does not equal
Guaranteed final pay

Employer billing rate
does not equal
Worker pay rate

Travel allowance
does not equal
Hourly wages

Estimated gross
does not equal
Net pay
```

Do not expose employer billing or platform margin to workers unless an approved policy requires it.

## 7. Eligibility Explanation

Requirement-gap explanations must be concise, actionable, and privacy-safe.

Examples:

- Licence required.
- Certification expired.
- Background-check requirement not satisfied.
- Availability conflict.
- Role approval under review.
- Requirement cannot currently be verified.

Actions:

- Review requirement.
- Update licence.
- Renew certification.
- View background-check status.
- Edit availability.
- Contact support.

The search page must not expose sensitive background-check details or present an eligibility
determination as a legal conclusion.

## 8. Availability Relationship

Page 022 remains the authoritative availability source.

Search may show:

- Available.
- Partially available.
- Conflict detected.
- Availability unknown.

Required boundary:

```text
Availability match
does not equal
Assignment eligibility
```

A worker may view a shift outside current availability, but the UX must explain the conflict before
application where appropriate. Search Shifts must not automatically alter availability.

## 9. Employer and Residence Information

Show enough information for an informed worker decision.

Potentially visible:

- Employer or residence name.
- General location.
- Residence type.
- Department.
- Approved operational summary.
- Worker rating or experience only if governed and truthful.
- Shift contact process.

Do not expose:

- Private resident information.
- Confidential staffing data.
- Internal employer notes.
- Sensitive facility details.
- Unverified ratings.
- Fabricated demand or scarcity.

## 10. Search Ranking and AI Governance

AI may:

- Rank by worker-selected preferences.
- Identify availability matches.
- Explain likely requirement gaps.
- Suggest relevant shifts.
- Summarize non-sensitive shift information.
- Recommend filter changes.

AI must not:

- Fabricate shifts.
- Fabricate employers.
- Hide shifts based on protected characteristics.
- Infer health, race, religion, family status, or other protected information.
- Decide final eligibility.
- Submit applications.
- Accept assignments.
- Set compensation.
- Create urgency.
- Penalize workers for declining shifts.
- Use background-check details for hidden ranking.

Every recommendation must explain why it appears, such as:

- Recommended because it matches your selected role.
- Matches your availability.
- Within your chosen travel distance.

Avoid opaque "Best for you" claims without explanation.

## 11. Empty and Error States

Required states:

| State | User-facing next action |
| --- | --- |
| No shifts found | Adjust filters, update availability, or save an alert. |
| Filters too narrow | Reset filters or broaden criteria. |
| No shifts matching availability | Edit availability or view shifts with conflicts explained. |
| Only shifts with requirement gaps | Review requirement tasks or contact support. |
| Search unavailable | Retry or contact support. |
| Stale result | Refresh before applying. |
| Shift filled | View similar shifts. |
| Shift cancelled | View status and similar shifts. |
| Shift changed | Review details before acting. |
| Application deadline passed | View similar shifts. |
| Location unavailable | Retry, adjust location filter, or contact support. |
| Compensation unavailable | Review details or contact support; do not estimate silently. |
| Eligibility unknown | Review details or contact support. |
| Offline state | View cached results only; applying requires connectivity. |
| Saved search has no new results | Adjust alert criteria or wait for future matches. |

Do not fabricate inventory in empty states.

## 12. Accessibility and International Readiness

Accessibility:

- Keyboard-accessible filters.
- Semantic search results.
- Accessible sorting.
- Screen-reader result count.
- No color-only eligibility states.
- Clear focus behavior.
- Accessible compensation labels.
- Time and timezone clarity.
- Status announcements when results update.
- Plain-language requirement gaps.
- Sufficient contrast.
- Accessible urgent-shift indicators.

International readiness:

- No hardcoded currency.
- No hardcoded compensation model.
- No fixed date or time format.
- No fixed week structure.
- No hardcoded role names.
- No hardcoded licence, certification, or background-check rules.
- No fixed distance units.
- No fixed travel assumptions.
- No hardcoded language, employer terminology, or labour standards.

Jurisdiction, employer, role, currency, locale, and assignment rules remain configurable.

## 13. Resolved Conditions

| Owner condition | Resolution |
| --- | --- |
| Separate discovery, suitability, eligibility, and application | Added independent four-layer model. |
| Clarify verified-worker boundary | Added verified-worker context and prohibited universal readiness badge. |
| Strengthen search result card | Added required placeholders without duplicating Page 024. |
| Compensation transparency | Added worker-pay, premiums, travel, estimate, and pay-boundary model. |
| Filters | Added hard-filter versus preference-sorting distinction. |
| Eligibility explanation | Added safe requirement-gap summaries and actions. |
| Availability relationship | Confirmed Page 022 as source and separated availability from eligibility. |
| Application boundary | Added safest flow and after-apply state progression. |
| Urgent and same-day shifts | Added urgency safety rules without pressure tactics. |
| Employer/residence information | Added allowed and prohibited visibility. |
| AI matching governance | Added explainable, non-discriminatory AI ranking boundaries. |
| Saved searches and alerts | Added explicit confirmation and alert-not-guarantee boundary. |
| Empty and error states | Added required states and next actions. |
| Privacy boundaries | Added worker-only, employer-visible, and platform-only separation. |
| Mobile design | Added compact mobile card with required state layers. |
| Desktop design | Added structured filter/results layout without duplicating Shift Details. |
| Accessibility | Added filter, result, sorting, status, and compensation accessibility requirements. |
| International readiness | Added configurable jurisdiction, currency, locale, and rule boundaries. |

## 14. Self Validation

| Requirement | Status |
| --- | --- |
| Frozen title remains Search Shifts | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-022 unchanged | Pass |
| EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged | Pass |
| No Page 024 files created | Pass |
| No implementation started | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| Unrelated app changes untouched | Pass |

## 15. Final Page Status

```text
Page 023 - Search Shifts
Revision 1: COMPLETE
Product Review Revision 1: REQUIRED
Approval Record: NOT CREATED IN THIS FILE

Page 024
BLOCKED UNTIL APPROVAL RECORD IS CREATED
```
