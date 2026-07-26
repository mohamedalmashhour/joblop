# Page 024 - Shift Details Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_024_SHIFT_DETAILS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens shift-information completeness, compensation transparency,
requirement and eligibility clarity, workplace and task safety, travel expectations, application
consent, cancellation and change terms, privacy, AI boundaries, and mobile decision usability.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-023.
- EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Authoritative Shift Record

Page 024 is the authoritative worker-facing record for the shift before application.

Where known, it must clearly display:

| Field | Display requirement |
| --- | --- |
| Role | Confirmed, estimated, pending confirmation, or unavailable. |
| Department | Confirmed, estimated, pending confirmation, or unavailable. |
| Employer or residence | Approved visibility only. |
| General location | Shown before application where permitted. |
| Exact work location | Shown according to approved visibility rules. |
| Date | Confirmed, changed, or pending confirmation. |
| Start time | Include timezone. |
| End time | Include timezone and overnight indicator when applicable. |
| Expected duration | Estimated or confirmed. |
| Break information | Paid/unpaid only where approved and known. |
| Number of workers requested | Shown only where appropriate. |
| Urgency | Standard, urgent, same-day, or unavailable. |
| Application deadline | Confirmed, estimated, or unavailable. |
| Shift status | Open, reviewing, filled, closed, cancelled, changed, temporarily unavailable, or unknown. |
| Last material update | Date/time placeholder or pending. |

Unknown or estimated information must never appear as final.

## 3. Shift Status and Material Change History

Truthful shift states:

- Open.
- Applications under review.
- Filled.
- Closed.
- Cancelled.
- Changed.
- Temporarily unavailable.
- Status unknown.

If a material change occurred, show:

- what changed;
- when it changed;
- whether the worker must review again;
- whether an existing application remains active.

Material changes may include:

- date;
- time;
- location;
- role;
- duties;
- compensation;
- employer;
- requirements;
- cancellation terms.

The page must not silently change a shift after a worker applies.

## 4. Revised Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                         Shift Details           Profile Help │
│ Worker: [Name]                       Source: Search Shifts          Alert │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AUTHORITATIVE SHIFT RECORD                                                 │
│ This page is the worker-facing source of truth before application.         │
│ Confirmed, estimated, pending, and unavailable information are labeled.    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ MATERIAL CHANGE ALERT                                                       │
│ Status: Changed / none / status unknown                                    │
│ Last material update: [Timestamp placeholder]                              │
│ Changed fields: [Time] [Compensation] [Requirements]                       │
│ Worker action: review again before applying. Existing application: [state] │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SHIFT INFORMATION                                                          │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Role                         │ Kitchen Cook - Confirmed                    │
│ Department                   │ Kitchen - Confirmed                         │
│ Employer / residence         │ [Approved operational name] - Confirmed     │
│ General location             │ [City/area] - Confirmed                     │
│ Exact work location          │ [Visibility per approved policy]            │
│ Date                         │ [Date] - Confirmed / changed                │
│ Start / end                  │ 16:00 - 22:00                               │
│ Timezone                     │ [Timezone shown]                            │
│ Overnight                    │ No / Yes                                    │
│ Expected duration            │ 6 hours - estimated or confirmed            │
│ Break information            │ [Paid/unpaid/pending/unavailable]           │
│ Workers requested            │ [Number if appropriate]                     │
│ Urgency                      │ Standard / urgent / same-day                │
│ Application deadline         │ [Confirmed / estimated / unavailable]       │
│ Shift status                 │ Open / reviewing / filled / cancelled       │
└──────────────────────────────┴─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW STATE EXPLANATION                                                 │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Viewing                      │ Worker is reviewing information             │
│ Applying                     │ Worker submits interest through Page 025    │
│ Selected                     │ Employer/platform may choose the worker for │
│                              │ further workflow                            │
│ Assigned                     │ Assignment is issued through approved flow  │
│ Accepted                     │ Worker confirms acceptance where required   │
│ Worked                       │ Attendance/check-in/out has occurred        │
│ Paid                         │ Future payment workflow has processed       │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Selected ≠ assigned. Assigned ≠ accepted. Accepted ≠ worked. Worked ≠ paid.│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DUTIES AND SCOPE OF WORK                                                   │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Expected duties              │ [Approved operational summary]              │
│ Department                   │ Kitchen                                     │
│ Level of responsibility      │ [Independent / assisted / support role]     │
│ Physical expectations        │ [Approved non-sensitive summary]            │
│ Required equipment/attire    │ [Approved summary]                          │
│ Reporting contact/process    │ [Process; sensitive details later if needed]│
│ Task exclusions              │ [Not outside approved role/scope]           │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Do not perform duties outside your approved role, licence, training, or    │
│ assignment scope. This page does not provide clinical instructions or      │
│ professional authorization.                                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ QUALIFICATION AND REQUIREMENT REVIEW                                       │
├──────────────────────────────┬────────────────────────────┬───────────────┤
│ Shift requirement            │ Worker current known status │ Action        │
│ Required role                │ Appears satisfied / review  │ Review role   │
│ Licence                      │ Required / gap / unknown    │ Review licence│
│ Certification                │ Required / expired / unknown│ Renew / review│
│ Background-check requirement │ Status summary only         │ View status   │
│ Language requirement         │ If lawful and necessary     │ Review        │
│ Employer orientation         │ Required / not required     │ Review        │
│ Assignment-specific training │ Required / not required     │ Review        │
│ Availability requirement     │ Available / conflict        │ Edit calendar │
│ Travel requirement           │ Within preference / distant │ Review travel │
└──────────────────────────────┴────────────────────────────┴───────────────┘
│ Requirement appears satisfied ≠ final legal determination. All listed      │
│ requirements satisfied ≠ guaranteed selection. Sensitive background-check  │
│ details are not shown here.                                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ COMPENSATION BREAKDOWN - WORKER-FACING ONLY                               │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Base hourly rate             │ [Amount + currency + confirmed/estimated]   │
│ Urgent/same-day premium      │ [If applicable and approved]                │
│ Evening premium              │ [If applicable and approved]                │
│ Night premium                │ [If applicable and approved]                │
│ Weekend premium              │ [If applicable and approved]                │
│ Holiday premium              │ [If applicable and approved]                │
│ Travel-time compensation     │ [If approved and applicable]                │
│ Transportation allowance     │ [If approved and applicable]                │
│ Mileage/fuel reimbursement   │ [If approved and applicable]                │
│ Minimum paid duration        │ [If approved and applicable]                │
│ Estimated hours              │ [Estimated / confirmed]                     │
│ Estimated gross compensation │ [Estimated / unavailable]                   │
│ Payment timing/method        │ [Approved summary if known]                 │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Estimated hours ≠ guaranteed paid hours. Estimated gross ≠ net pay.        │
│ Travel time ≠ transportation allowance. Reimbursement ≠ wages. Employer    │
│ billing ≠ worker compensation. Employer billing, credit terms, platform    │
│ margin, and internal pricing calculations are not shown to workers.        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ URGENT / SAME-DAY PRICING BOUNDARY                                         │
│ Amounts must identify who receives them, what they cover, whether they are │
│ estimated or confirmed, and the applicable currency. Client charge is not  │
│ automatically worker pay. No rate is universal unless an approved policy   │
│ says so.                                                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORKPLACE INFORMATION                                                       │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Facility/residence type      │ [Approved type]                             │
│ Department                   │ Kitchen                                     │
│ Work environment             │ [Approved operational summary]              │
│ Accessibility information    │ [If operationally relevant]                 │
│ Parking/transit              │ [Approved summary]                          │
│ Entrance/check-in process    │ [General process; sensitive details later]  │
│ Attire/equipment             │ [Approved expectations]                     │
│ Workplace communication      │ [Language where lawful and relevant]        │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Sensitive security instructions may appear only at the correct stage, such │
│ as after assignment acceptance, according to approved policy.              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TRAVEL AND LOCATION                                                        │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ General location             │ [Shown before application]                  │
│ Distance / travel time       │ [Estimate / unavailable]                    │
│ Preference comparison        │ [Within preference / distant-site warning]  │
│ Parking/transit summary      │ [Approved summary]                          │
│ Travel compensation          │ [If applicable]                             │
│ Transportation allowance     │ [If applicable]                             │
│ Remote/distant-site indicator│ [Shown when relevant]                       │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Travel estimate ≠ guaranteed travel time. Transportation allowance ≠       │
│ reimbursement of every expense. A distant location must not be hidden      │
│ behind vague wording. Exact live worker location is not requested or shown.│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AVAILABILITY AND CONFLICT REVIEW                                           │
│ Source: Page 022 Availability Calendar                                     │
│ Status: Available / partially available / conflict detected / unknown /    │
│ existing protected commitment                                              │
│ Availability match ≠ eligibility. No conflict detected ≠ guaranteed        │
│ acceptance. Applying ≠ changing availability. This page never modifies     │
│ availability automatically.                                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION CONFIRMATION PREVIEW                                           │
│ Before applying, the worker must confirm review of:                        │
│ [ ] Shift date and time                                                    │
│ [ ] Location and travel                                                    │
│ [ ] Role and duties                                                        │
│ [ ] Compensation                                                           │
│ [ ] Known requirements                                                     │
│ [ ] Cancellation or withdrawal terms                                       │
│ [ ] Material shift policies                                                │
│ Confirmations are not preselected and unrelated consent is not bundled.    │
│ Review shift → Review requirements/gaps → Confirm application information │
│ → Apply. Application submitted ≠ shift assigned.                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CANCELLATION, WITHDRAWAL, AND CHANGE TERMS                                 │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Before assignment            │ Application withdrawal, employer shift      │
│                              │ cancellation, employer material change      │
│ After assignment/acceptance  │ Worker cancellation workflow, employer      │
│                              │ cancellation workflow, no-show/attendance,  │
│                              │ support escalation, applicable approved     │
│                              │ compensation or fee policy                  │
└──────────────────────────────┴─────────────────────────────────────────────┘
│ Changing or withdrawing an application is not the same as cancelling an    │
│ accepted assignment. Penalties or fees must not be invented or punitive.   │
│ Terms may depend on timing, status, approved rules, and exceptional        │
│ circumstances.                                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ POLICY SUMMARY                                                             │
│ Where approved, summarize or link to policies for late arrival, absence,   │
│ cancellation, break handling, overtime, expenses, workplace conduct,       │
│ confidentiality, safety, incident reporting, timekeeping, and check-in/out.│
│ This page does not replace full policy documents and does not display      │
│ policy claims without approved sources.                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER INFORMATION AND TRUST                                             │
│ Show truthful approved information only: employer/residence name, verified │
│ business status where genuinely verified, facility type, governed rating   │
│ or experience metrics where evidence-based, completed shift count where    │
│ accurate, cancellation behavior if governed, and worker-support process.   │
│ No fabricated ratings, unsupported trust labels, fake urgency, fake demand,│
│ invented scarcity, fake testimonials, internal risk data, or credit data.  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY BOUNDARIES                                                         │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE AFTER     │ PLATFORM ONLY    │
│ Saved status               │ APPROVED WORKFLOW          │ Audit history    │
│ Application draft          │ Relevant profile summary   │ Fraud controls   │
│ Private note               │ Relevant qualifications    │ Support notes    │
│ Requirement-gap details    │ Operational availability   │ Policy data      │
│ Availability conflict      │ Shift-specific answers     │                  │
│ Viewing history            │ Application status         │                  │
└────────────────────────────┴────────────────────────────┴──────────────────┘
│ Viewing a shift does not expose private worker data to employers.          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI EXPLANATION PANEL                                                       │
│ AI may summarize shift information, explain compensation labels, explain   │
│ requirement gaps, explain travel expectations, identify material changes,  │
│ compare the shift with entered preferences, and answer questions using     │
│ approved shift information. AI summaries are subordinate to the structured │
│ shift record. AI must not fabricate details, decide eligibility, apply,    │
│ accept, negotiate compensation, waive requirements, alter terms, hide      │
│ material risks, infer protected characteristics, pressure the worker, or   │
│ provide clinical or regulated-work authorization.                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACTION AREA                                                                │
│ Primary safe action: [Begin application]                                   │
│ Secondary actions: [Save shift] [Back to search] [Contact support]         │
│ Disabled examples: requirement gap, stale shift data, material change not  │
│ reviewed, account restriction, offline state, deadline passed, shift filled│
│ or cancelled.                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Decision Wireframe

```text
┌──────────────────────────────┐
│ Shift Details          Help  │
│ Kitchen Cook                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AUTHORITATIVE RECORD         │
│ Labels: confirmed/estimated/ │
│ pending/unavailable          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CHANGE ALERT                 │
│ Changed: time + pay          │
│ Review again before apply    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SHIFT SUMMARY                │
│ Role: Kitchen Cook           │
│ Date: [Date]                 │
│ Time: 16:00-22:00            │
│ Timezone: [Shown]            │
│ Duration: 6h estimated       │
│ Location: [General area]     │
│ Status: Open                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ COMPENSATION                 │
│ Base rate: [amount/currency] │
│ Premium: [if approved]       │
│ Travel: [if approved]        │
│ Est. gross: [amount]         │
│ Est. gross ≠ net pay         │
│ Employer billing not shown   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REQUIREMENTS                 │
│ Role: appears satisfied      │
│ Licence: required/gap        │
│ Certification: status        │
│ Background: summary only     │
│ Availability: conflict/ok    │
│ [Review requirement]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ DUTIES AND SAFETY            │
│ Approved duties summary      │
│ Do not work outside approved │
│ role, licence, training, or  │
│ assignment scope             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRAVEL                       │
│ Distance/time estimate       │
│ Distant-site warning if any  │
│ Estimate ≠ guaranteed time   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ APPLY CONFIRMATION PREVIEW   │
│ Review date/time             │
│ Review travel                │
│ Review compensation          │
│ Review requirements          │
│ No boxes preselected         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI SUMMARY                   │
│ Uses approved shift info     │
│ AI does not apply or decide  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ [Begin application]          │
│ Disabled: reason shown       │
│ [Save] [Back]                │
└──────────────────────────────┘
```

Mobile requirements:

- Role, date/time, location, pay, status, requirement summary, availability conflict, primary action,
  and material-change alert appear before secondary details.
- Sticky action area may be used only if warnings, material changes, and required confirmations stay
  visible and accessible.
- Secondary details may collapse, but material terms must not be hidden behind excessive accordions.
- Touch targets must be at least 44px.

## 6. Material Information Unavailable

If critical information is missing, show it clearly.

Examples:

- Compensation not yet confirmed.
- Exact location pending.
- Duties incomplete.
- Requirement status unavailable.
- Employer details under review.
- Cancellation policy unavailable.

Where missing information prevents informed consent, application should be blocked or require an
explicitly governed exception.

Do not fill missing information with assumptions.

## 7. Error and Edge States

Required states:

- Shift unavailable.
- Shift filled.
- Shift cancelled.
- Shift materially changed.
- Stale shift data.
- Application deadline passed.
- Compensation unavailable.
- Requirement information unavailable.
- Eligibility status unknown.
- Availability conflict.
- Overnight shift.
- Distant-site shift.
- Travel estimate unavailable.
- Employer information unavailable.
- Offline state.
- Application submission failed.
- Duplicate application.
- Prior application withdrawn.
- Support unavailable.

Each state must explain what happened and the safe next action without duplicating Page 025.

## 8. Handoff Boundaries

Page 024 connects from:

- Page 023 - Search Shifts.

Page 024 may hand off to future governed workflows:

- application submission;
- application status;
- assignment offer;
- assignment acceptance;
- upcoming shift;
- attendance;
- timekeeping;
- payment.

Page 024 does not own assignment, attendance, payroll, or application submission logic.

## 9. Accessibility

Accessibility requirements:

- Semantic headings.
- Keyboard navigation.
- Screen-reader shift summary.
- Compensation label clarity.
- Accessible requirement states.
- No color-only warnings.
- Status announcements.
- Accessible confirmation controls.
- Focus management after action attempts.
- Plain-language policies.
- Accessible material-change alerts.
- Sufficient contrast.
- Clear time and timezone formatting.

## 10. International Readiness

Do not hardcode:

- currency;
- pay model;
- overtime rules;
- break rules;
- cancellation rules;
- role names;
- licence requirements;
- certification requirements;
- background-check requirements;
- date and time format;
- timezone;
- distance unit;
- travel policy;
- labour standards;
- employment classification;
- tax treatment;
- language.

Jurisdiction, employer, role, assignment, currency, and policy configuration remain separate.

## 11. Resolved Conditions

| Owner condition | Resolution |
| --- | --- |
| Authoritative shift record | Added complete structured shift record with information confidence labels. |
| Shift status and change history | Added truthful states, material-change alert, and review-again requirement. |
| Compensation breakdown | Added detailed worker-facing compensation sections and Financial UX boundaries. |
| Urgent same-day pricing boundary | Added recipient/coverage/currency/estimated-confirmed distinction and no hardcoded universal rate. |
| Duties and scope of work | Added duties, responsibility, exclusions, and scope reminders. |
| Qualification and requirement review | Added requirement/status/action matrix with legal-decision boundary. |
| Role and safety boundary | Added regulated/safety-sensitive scope warnings and support path. |
| Workplace information | Added approved workplace details and sensitive-instruction boundary. |
| Travel and location | Added travel estimate, distant-site, allowance, and live-location boundaries. |
| Availability and conflict review | Confirmed Page 022 as source and separated availability from eligibility/acceptance. |
| Application confirmation | Added review checklist with no bundled/preselected consent. |
| Application data boundary | Clarified Page 024 does not duplicate onboarding or Page 025. |
| Cancellation, withdrawal, and change terms | Added before/after assignment split and no invented penalties. |
| Shift policies | Added approved-policy summary boundaries. |
| Employer information and trust | Added truthful-only employer trust constraints. |
| Privacy boundaries | Added worker-only, employer-visible, and platform-only separation. |
| AI boundaries | Added subordinate AI summary and prohibited decisions/actions. |
| Material information unavailable | Added missing-critical-information handling. |
| Error and edge states | Added complete list and safe next-action requirement. |
| Mobile decision usability | Added mobile prioritization and material-term visibility rules. |
| Desktop design | Added main record, compensation, requirements, workplace, travel, policies, and action structure. |
| Accessibility | Added semantic, status, compensation, confirmation, and material-change accessibility requirements. |
| International readiness | Added configurable locale, policy, jurisdiction, currency, and work-rule boundaries. |
| Handoff boundaries | Added explicit handoff to application, assignment, attendance, timekeeping, and payment workflows without owning them. |

## 12. Self Validation

| Requirement | Status |
| --- | --- |
| Frozen title remains Shift Details | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-023 unchanged | Pass |
| EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged | Pass |
| No Page 025 files created | Pass |
| No implementation started | Pass |
| No React created | Pass |
| No frontend created | Pass |
| No backend created | Pass |
| No APIs created | Pass |
| No database changes created | Pass |
| Unrelated app changes untouched | Pass |

## 13. Final Page Status

```text
Page 024 - Shift Details
Revision 1: COMPLETE
Product Review Revision 1: REQUIRED
Approval Record: NOT CREATED IN THIS FILE

Page 025
BLOCKED UNTIL APPROVAL RECORD IS CREATED
```
