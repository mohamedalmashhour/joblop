# Page 032 - Ratings Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Employer, Support, Compliance, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Financial boundary baseline: EPIC_3_FINANCIAL_BOUNDARY_REVIEW.md
Frozen architecture source: pages/PAGE_032_RATINGS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 031 | Payments | pages/PAGE_031_PAYMENTS.md |
| 032 | Ratings | pages/PAGE_032_RATINGS.md |
| 033 | Messages | pages/PAGE_033_MESSAGES.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Ratings is the authenticated worker page for viewing governed ratings and feedback connected to
completed shifts, while preventing retaliation, abuse, unsupported claims, and unsafe reputation
automation.

The page allows the worker to:

- view ratings and feedback connected to completed shifts;
- understand which ratings are published, pending, disputed, or removed;
- understand who submitted the rating at a safe source-type level;
- distinguish private operational feedback from public reputation;
- respond through an approved dispute or support path;
- understand how ratings may affect matching or visibility, only where governed and truthful;
- submit employer or shift feedback only if the frozen architecture assigns that responsibility here.

The page must not:

- fabricate ratings;
- create a universal worker score;
- automatically rank or penalize workers;
- expose confidential employer or resident information;
- expose private reviewer identities unnecessarily;
- publish allegations without governance;
- use ratings as legal or professional authorization;
- allow AI to decide misconduct or employment eligibility;
- silently remove or change feedback;
- guarantee that every rating is accurate or verified.

## 3. Rating Domains

The page must keep these domains visually independent.

| Domain | Meaning | Boundary |
| --- | --- | --- |
| Worker rating received | Feedback submitted about the worker after a completed shift | Not professional authorization |
| Employer or residence rating | Feedback submitted by worker where permitted | Separate from worker rating |
| Private operational feedback | Visible only to authorized staff or relevant party | Not public reputation |
| Public reputation | Intentionally published under approved policy | Not automatic from submission |
| Internal quality or safety signal | Governed internal signal | Not a public rating |

Do not combine these into one generic rating score.

## 4. Rating Eligibility

A rating should connect to an actual governed event.

Possible eligibility basis:

- completed shift;
- confirmed attendance;
- closed assignment;
- authorized reviewer;
- eligible review window.

Required boundaries:

```text
Shift accepted
does not equal
Eligible to rate

Check-in
does not equal
Eligible to rate

Completed attendance
does not equal
Automatically published rating
```

Do not allow ratings for unrelated or fabricated shifts.

## 5. Desktop Wireframe

```text
HEADER
Resident Job | Ratings | Worker: [Name] | Help | Notifications

BOUNDARY NOTICE
Ratings are governed feedback records.
Rating is not licence, certification, eligibility, employment status, or misconduct decision.
AI does not publish, remove, rank, or decide misconduct.

RATING DOMAIN TABS
[Received ratings]
[Employer/residence feedback]
[Private operational feedback]
[Public reputation]
[Questions and disputes]

SUMMARY
- Current visible ratings count: [count]
- Pending feedback: [count]
- Disputed feedback: [count]
- Removed/restricted feedback: [count]
- Last updated: [timestamp]
- Visibility policy: [summary]

NUMERIC RATING SUMMARY, IF POLICY ALLOWS
Scale: [scale]
Number of ratings: [count]
Period: [current period / lifetime]
Public/private source: [label]
Missing rating treatment: [label]
Rounding: [label]
Last updated: [timestamp]

High rating != eligible for every shift.
Low rating != misconduct.
Rating != licence or certification.

RATING RECORDS
| Shift | Role | Residence | Date | Source type | Category | Result | Feedback | Publication | Moderation | Dispute | Submitted | Updated | Action |
| [shift ref] | [role] | [safe residence] | [date] | [source type] | [category] | [score/category] | [summary] | [state] | [state] | [state] | [date] | [date] | [respond/dispute/support] |

RATING STATES
Submission: Draft / Submitted / Withdrawn where permitted
Publication: Private / Shared with relevant party / Published / Not published / Removed / Unavailable
Moderation: Not reviewed / Under review / Approved / Correction requested / Restricted / Removed / Unavailable
Dispute: No dispute / Question raised / Correction requested / Formal dispute open / Resolved / Closed / Unavailable

WRITTEN FEEDBACK GOVERNANCE
- Structured categories
- Optional written comment
- Plain-language guidance
- Prohibited-content warning
- Privacy reminder
- Report or dispute action

PUBLIC / PRIVATE VISIBILITY
Before submission or response:
- Private to platform
- Shared with worker
- Shared with employer
- Published on profile
- Used for internal quality review

ANONYMITY LIMITS
Identified to recipient / Name hidden from recipient / Identity visible to authorized moderation staff / Fully anonymous unavailable

WORKER RESPONSE
Draft -> Submitted -> Under review -> Published / Restricted / Withdrawn where permitted
Preserve original response, revision, actor, timestamp, and moderation state.

DISPUTE AND CORRECTION
Wrong shift / wrong worker / inaccurate factual statement / prohibited content / discrimination concern
/ privacy concern / duplicate rating / retaliation concern / unauthorized rating

Question != correction request.
Correction request != formal dispute.
Formal dispute != guaranteed removal.

RETALIATION AND FAIRNESS
Low rating does not automatically equal misconduct.
Ratings must not punish support use, disputes, limited availability, cancellation context, or protected traits.

MATCHING AND REPUTATION BOUNDARY
Rating may be one governed input.
Rating is not automatic selection, hidden blacklist, licence, certification, background-check outcome,
availability, or legal eligibility.

MODERATION
Automated flag -> human review required -> publication restricted / correction requested / removed / restored
AI may flag; human/governed review decides high-impact outcomes.

REMOVAL / SUPPRESSION
Original record, moderation reason, actor, timestamp, publication impact, dispute status, and audit history remain preserved.

PRIVACY
Worker-visible: own received ratings, feedback intended for them, disputes, responses, status.
Employer-visible: governed relevant feedback only.
Platform-only: moderation notes, internal signals, audit history, support notes, protected reporter identity.

AI ASSISTANCE
AI may summarize visible feedback, identify potentially prohibited content, help draft respectful responses,
explain states, and route to support.
AI must not fabricate, publish, remove, rank, decide misconduct, determine eligibility, disclose reporter identity,
or infer clinical competence.
```

## 6. Rating Categories

Categories remain configurable.

Possible worker-facing categories:

- punctuality;
- reliability;
- communication;
- professionalism;
- role preparedness;
- teamwork;
- workplace conduct;
- shift accuracy;
- support experience;
- safety process.

Do not treat subjective ratings as proof of professional competence.

Do not hardcode categories as universal or legally meaningful.

## 7. Numeric Rating Boundary

If a numeric score is shown, it must identify:

- scale;
- number of ratings;
- current period versus lifetime;
- whether missing ratings affect the average;
- rounding method;
- public versus private data;
- last updated.

Do not show false precision.

Do not use a single score to imply universal worker quality.

Required boundaries:

```text
High rating
does not equal
Eligible for every shift

Low rating
does not equal
Misconduct

Rating
does not equal
Licence or certification
```

## 8. Written Feedback Governance

Written feedback must be governed.

Support:

- structured categories;
- optional written comment;
- plain-language guidance;
- prohibited-content warning;
- privacy reminder;
- report or dispute action.

Do not allow or encourage:

- resident names;
- medical details;
- protected personal information;
- discriminatory language;
- threats;
- harassment;
- confidential employer information;
- unsupported criminal or safety allegations.

## 9. Public and Private Feedback

Clearly show visibility before submission.

Examples:

- Private to platform.
- Shared with worker.
- Shared with employer.
- Published on profile.
- Used for internal quality review.

Do not publish feedback merely because it was submitted.

Do not silently convert private feedback into public content.

## 10. Anonymous and Identified Feedback

If anonymity exists, explain its limits truthfully.

Possible states:

- Identified to recipient.
- Name hidden from recipient.
- Identity visible to authorized moderation staff.
- Fully anonymous unavailable.

Do not promise absolute anonymity where audit, safety, legal, or dispute processes may require
identity access.

## 11. Worker Response

Where permitted, allow a governed worker response.

Support:

- response draft;
- response submitted;
- response under review;
- response published;
- response restricted;
- response withdrawn where permitted.

Do not allow edits that erase prior published history silently.

Preserve:

- original response;
- revision;
- actor;
- timestamp;
- moderation state.

## 12. Dispute and Correction

Provide clear entry points for:

- wrong shift;
- wrong worker;
- inaccurate factual statement;
- prohibited content;
- discrimination concern;
- privacy concern;
- duplicate rating;
- retaliation concern;
- rating submitted by unauthorized person.

Required boundaries:

```text
Question
does not equal
Correction request

Correction request
does not equal
Formal dispute

Formal dispute
does not equal
Guaranteed removal
```

Page 032 does not own the full dispute workflow unless a future approved architecture change assigns
that responsibility here.

## 13. Retaliation and Fairness

Address risks such as:

- employer retaliation after a worker raises a safety issue;
- worker retaliation after cancellation;
- rating manipulation;
- reciprocal pressure;
- rating exchange;
- review bombing;
- discrimination;
- punishment for limited availability;
- punishment for using support or dispute rights.

Do not automatically treat a low rating as misconduct.

Provide a moderation or support path.

## 14. Matching and Reputation Boundary

If ratings influence future matching, show only governed and explainable concepts.

```text
Rating may be one approved input
does not equal
Automatic selection decision
```

Ratings must not:

- override licence requirements;
- override certification requirements;
- override background-check governance;
- replace availability;
- determine legal eligibility;
- create hidden blacklists;
- use protected characteristics;
- penalize workers for disputing feedback.

Do not imply an unapproved matching algorithm.

## 15. Employer Rating Boundary

If workers rate employers or residences, keep this separate from worker ratings.

Possible categories:

- shift description accuracy;
- workplace preparedness;
- communication;
- safety process;
- respectful treatment;
- schedule accuracy;
- payment or attendance support;
- cancellation experience.

Do not expose confidential employer financial or resident information.

Do not allow fabricated public accusations.

## 16. Moderation

Represent a governed moderation process.

Possible states:

- automated content flag;
- human review required;
- publication restricted;
- correction requested;
- removed;
- restored;
- appeal or support available.

AI may assist with content flagging but must not make final high-impact decisions alone.

Do not reveal internal fraud or moderation rules in a way that enables evasion.

## 17. Rating Removal and Suppression

If content is removed or hidden, preserve:

- original record;
- moderation reason;
- actor;
- timestamp;
- publication impact;
- dispute status;
- audit history.

Do not silently erase history.

Do not present removed content publicly.

## 18. Privacy Boundaries

Worker-visible:

- their own received ratings;
- published feedback;
- private feedback intended for them;
- their disputes and responses;
- rating status.

Employer-visible:

- governed worker feedback relevant to them;
- their own rating history where permitted;
- no unrelated worker ratings or private disputes.

Platform-only:

- moderation notes;
- internal safety signals;
- audit history;
- fraud controls;
- support notes;
- reporter identity where protected.

Do not expose resident information or unrelated private history.

## 19. Staff Access Auditability

Conceptually require auditing for staff access to:

- private feedback;
- reporter identity;
- retaliation reports;
- moderation decisions;
- removed content;
- dispute materials.

Audit records should include:

- actor;
- role;
- action;
- rating reference;
- reason or case reference;
- timestamp;
- result.

Do not log prohibited content unnecessarily into broad logs.

## 20. AI Boundaries

AI may:

- summarize visible feedback;
- identify potentially prohibited content;
- detect duplicate wording or spam indicators;
- help the worker draft a respectful response;
- explain rating states;
- route to support.

AI must not:

- fabricate ratings;
- publish feedback automatically;
- decide misconduct;
- determine worker eligibility;
- create hidden reputation scores;
- rank using protected characteristics;
- remove ratings without governed review;
- disclose reporter identity;
- retaliate against disputing users;
- infer clinical competence;
- resolve disputes alone.

The governed rating record remains authoritative.

## 21. Empty and Error States

Include:

- no ratings yet;
- rating pending;
- private feedback only;
- moderation pending;
- dispute open;
- rating removed;
- rating restored;
- response pending;
- publication unavailable;
- duplicate rating;
- stale average;
- rating data unavailable;
- service unavailable;
- support unavailable.

Do not fabricate reputation data.

## 22. Mobile Wireframe

Mobile must prioritize:

1. Overall summary.
2. Number of ratings.
3. Category breakdown.
4. Recent feedback.
5. Visibility status.
6. Dispute or response action.
7. Moderation status.
8. Clear public/private labels.
9. Large touch targets.
10. Plain-language guidance.

```text
MOBILE TOP
Ratings

BOUNDARY NOTICE
Ratings are governed feedback, not licence, eligibility, or misconduct decisions.

SUMMARY
Ratings: [count]
Pending: [count]
Disputed: [count]
Visibility: [public/private summary]
Last updated: [timestamp]

RATING CARD
[Shift reference]
[Role / residence / date]
Source type: [safe source label]
Category: [category]
Result: [score/category if allowed]
Visibility: [private/shared/published/not published/removed]
Moderation: [state]
Dispute: [state]
[View feedback]
[Respond]
[Question or dispute]

EMPLOYER FEEDBACK SECTION
[Separate from worker received ratings]

AI HELP
[Explain this rating status]
```

Avoid dense reputation dashboards.

## 23. Desktop Wireframe Principles

Desktop may use:

- rating summary;
- category breakdown;
- rating history;
- published/private filters;
- written feedback;
- response panel;
- dispute and moderation status;
- employer-feedback section where applicable;
- privacy guidance.

Do not combine worker and employer ratings into one ambiguous score.

## 24. Accessibility

The page must support:

- semantic rating summaries;
- screen-reader-friendly scale labels;
- no color-only rating states;
- accessible written feedback;
- keyboard navigation;
- accessible filters;
- clear moderation status;
- accessible dispute controls;
- plain-language visibility labels;
- focus management;
- sufficient contrast.

## 25. International Readiness

The page must not hardcode:

- rating scale;
- public-review model;
- moderation law;
- defamation terminology;
- dispute deadlines;
- category names;
- language;
- anonymity rules;
- publication rules;
- worker-classification assumptions;
- protected-characteristic rules;
- data-retention periods.

Jurisdiction, employer, assignment, locale, moderation policy, and publication policy remain
configurable.

## 26. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Ratings | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-031 unchanged | Pass |
| Financial Boundary Review unchanged | Pass |
| No Page 033 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No rating implementation created | Pass |
| No moderation implementation created | Pass |
| No reputation-scoring implementation created | Pass |
| No notification implementation created | Pass |
| No dispute implementation created | Pass |

## 27. Final Wireframe Status

```text
Page 032 - Ratings
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 033 - Messages
BLOCKED
```
