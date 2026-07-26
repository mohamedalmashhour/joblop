# Page 032 - Ratings Wireframe Revision 1

Status: Approved revision complete
Epic: Epic 3 - Worker Portal
Page: 032 - Ratings
Revision: 1
Approval target: Approved Wireframe v1.0
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Financial boundary baseline: EPIC_3_FINANCIAL_BOUNDARY_REVIEW.md
Frozen architecture source: pages/PAGE_032_RATINGS.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision resolves only the approved owner-review conditions for Page 032.

Revision 1 strengthens:

- reputation governance;
- fairness protections;
- reviewer authority;
- moderation boundaries;
- retaliation protection;
- auditability;
- AI boundaries;
- privacy;
- future integration readiness.

This revision does not change:

- Architecture Freeze;
- Epic 3 Planning;
- UX Foundation;
- Navigation;
- Pages 016-031;
- Financial Boundary Review.

## 2. Summary of Changes

| Condition | Revision 1 response |
| --- | --- |
| Reviewer authority | Added eligible, authenticated, and authorized reviewer distinctions. |
| Reputation independence | Separated individual rating, category score, rolling average, lifetime reputation, public reputation, internal signal, moderation status, and matching signal. |
| Fairness protections | Added governed review paths for retaliation, discrimination, review bombing, duplicate ratings, coordinated manipulation, unauthorized access, and out-of-window ratings. |
| Moderation lifecycle | Split submission, publication, moderation, appeal, removal, restoration, and correction. |
| Auditability | Required actor, role, timestamp, action, reason/case reference across rating lifecycle events. |
| Privacy | Limited worker-visible data and protected internal moderation notes, identities, resident data, and unrelated worker data. |
| AI boundary | Reconfirmed AI cannot publish, remove, decide misconduct, calculate reputation, or expose protected identities. |
| Future boundary | Confirmed Page 032 does not own messaging, notifications, disputes, fraud, reputation engine, recommendations, search ranking, or matching. |

## 3. Reviewer Authority

The page must distinguish three reviewer concepts:

| Reviewer concept | Meaning | Boundary |
| --- | --- | --- |
| Eligible reviewer | A person or party that may be eligible to review based on a governed event | Not automatically allowed to submit |
| Authenticated reviewer | A signed-in person whose account access is confirmed | Not automatically authorized |
| Authorized reviewer | A reviewer permitted by role, event, timing, and policy to submit feedback | Only this state may submit |

Required boundary:

```text
Authenticated
does not equal
Authorized to submit a rating
```

A completed shift alone must not automatically authorize every participant to submit feedback.

Reviewer authorization may depend on:

- completed and closed shift;
- confirmed attendance;
- authorized relationship to the shift;
- eligible review window;
- role or permission;
- moderation or policy status.

## 4. Reputation Independence

The following concepts must stay independent:

- individual rating;
- category score;
- rolling average;
- lifetime reputation;
- public reputation;
- internal quality signal;
- moderation status;
- matching signal.

Required boundary:

```text
One rating value
does not equal
Complete worker reputation
```

Do not allow one value to represent all reputation or quality concepts.

## 5. Rating Impact Explanation

Add a dedicated worker-facing section:

```text
HOW RATINGS MAY BE USED

Ratings may help explain completed shift feedback under approved policy.
Ratings may be one governed input where matching policy allows.
Ratings may help identify feedback that needs human review.

Ratings do not automatically:
- approve or reject workers;
- prove professional competence;
- replace licences, certifications, background checks, or availability;
- create hidden blacklists;
- decide misconduct;
- punish support use or disputes;
- determine legal eligibility;
- override human review.
```

## 6. Fairness Protection Panel

Every fairness concern should have a governed review path.

```text
FAIRNESS AND RETALIATION SUPPORT

Concern type:
[Retaliation / discrimination / duplicate rating / review bombing / manipulation /
 unauthorized access / outside review window / protected information]

Related rating:
[rating reference]

What happened:
[worker explanation]

Current status:
[question / correction request / formal dispute / under review / closed]

Next step:
[support route / moderation review / provide information]
```

The page must protect against:

- retaliation;
- discrimination;
- review bombing;
- duplicate ratings;
- coordinated manipulation;
- ratings after unauthorized access;
- ratings outside the review window.

No concern automatically changes employment, eligibility, rating visibility, or misconduct status.

## 7. Moderation Lifecycle

Represent separate state lanes:

| Lifecycle lane | States |
| --- | --- |
| Submission | Draft / Submitted / Withdrawn where permitted |
| Publication | Private / Shared with relevant party / Published / Not published / Removed / Unavailable |
| Moderation | Not reviewed / Under review / Approved / Correction requested / Restricted / Removed / Review unavailable |
| Appeal | Not requested / Requested / Under review / Resolved / Closed / Unavailable |
| Removal | Not removed / Removed / Hidden / Suppressed / Pending review |
| Restoration | Not applicable / Requested / Restored / Rejected / Unavailable |
| Correction | None / Requested / Under review / Applied / Rejected / Superseded |

No state should imply another.

Examples:

```text
Submitted
does not equal
Published

Published
does not equal
Moderation complete

Removed
does not equal
Deleted

Appeal open
does not equal
Rating restored
```

## 8. Public Publication Boundary

Private operational feedback, internal safety signals, and submitted feedback do not become public
reputation unless approved policy and visibility rules allow it.

Required labels:

- Private to platform.
- Shared with worker.
- Shared with employer.
- Published on profile.
- Used for internal quality review.
- Removed from public view.
- Publication unavailable.

Do not silently convert private feedback into public content.

Do not publish feedback merely because it was submitted.

## 9. Auditability

Conceptually preserve audit history for:

- rating creation;
- edits;
- moderation;
- publication;
- removal;
- restoration;
- disputes;
- staff review.

Audit records should include:

- actor;
- role;
- timestamp;
- action;
- rating reference;
- reason or case reference;
- result.

Do not log prohibited content unnecessarily into broad logs.

Do not silently erase original rating records, responses, publication decisions, moderation actions,
or dispute states.

## 10. Privacy

Worker-visible information is limited to:

- their own ratings;
- intended feedback;
- governed visibility;
- approved responses.

Do not expose:

- internal moderation notes;
- protected identities;
- confidential employer information;
- resident information;
- unrelated worker data;
- fraud controls;
- support-only notes;
- protected reporter identity except where policy permits.

## 11. AI Boundary

AI may:

- summarize visible feedback;
- explain rating states;
- assist respectful responses;
- identify possible prohibited content.

AI must never:

- publish ratings;
- remove ratings;
- decide misconduct;
- determine worker eligibility;
- calculate reputation;
- override moderation;
- expose protected identities;
- create hidden reputation scores;
- rank using protected characteristics;
- infer clinical competence;
- resolve disputes alone.

The governed rating record remains authoritative.

## 12. Future Boundary

Page 032 does not own:

- messaging;
- notifications;
- formal dispute workflow;
- fraud detection;
- reputation engine;
- recommendation engine;
- search ranking;
- employer matching.

Page 032 may provide governed entry points only where appropriate:

- contact support;
- raise question;
- request correction;
- route retaliation concern;
- view visibility status;
- open future dispute workflow.

## 13. Revised Desktop Structure

```text
HEADER
BOUNDARY NOTICE
REVIEWER AUTHORITY PANEL
RATING DOMAIN TABS
SUMMARY
NUMERIC RATING SUMMARY, IF POLICY ALLOWS
RATING IMPACT EXPLANATION
RATING RECORDS
INDEPENDENT RATING STATES
WRITTEN FEEDBACK GOVERNANCE
PUBLIC / PRIVATE VISIBILITY
ANONYMITY LIMITS
WORKER RESPONSE
FAIRNESS AND RETALIATION SUPPORT
DISPUTE AND CORRECTION
MATCHING AND REPUTATION BOUNDARY
MODERATION LIFECYCLE
REMOVAL / RESTORATION / CORRECTION
PRIVACY
STAFF ACCESS AUDITABILITY
AI ASSISTANCE
FUTURE BOUNDARY
```

## 14. Revised Mobile Structure

```text
MOBILE TOP
Ratings

BOUNDARY NOTICE
Ratings are governed feedback, not licence, eligibility, punishment, or misconduct decisions.

REVIEWER AUTHORITY
Eligible / Authenticated / Authorized

IMPACT
Ratings may be one governed input.
Ratings do not automatically block work or create hidden blacklists.

SUMMARY
Ratings: [count]
Pending: [count]
Disputed: [count]
Visibility: [public/private summary]
Last updated: [timestamp]

RATING CARD
[Shift reference]
[Role / residence / date]
Result: [score/category if allowed]
Publication: [state]
Moderation: [state]
Appeal: [state]
Dispute: [state]
[Respond]
[Question or dispute]
[Report retaliation concern]

AI HELP
[Explain this rating status]
```

Avoid dense reputation dashboards.

## 15. Accessibility

The revision preserves:

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

## 16. International Readiness

Do not hardcode:

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

## 17. Self Validation

| Requirement | Result |
| --- | --- |
| Reviewer authority is governed | Pass |
| Rating states remain independent | Pass |
| Retaliation protections are clear | Pass |
| Moderation lifecycle is complete | Pass |
| Privacy boundaries are preserved | Pass |
| Auditability is documented | Pass |
| AI cannot influence reputation decisions | Pass |
| No governance, fairness, or privacy risks remain at wireframe level | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-031 unchanged | Pass |
| No Page 033 created | Pass |
| No implementation started | Pass |

## 18. Final Revision Status

```text
Page 032 - Ratings
Wireframe Revision 1: COMPLETE
Approval target: APPROVED WIREFRAME v1.0

Page 033 - Messages
UNBLOCKED as next controlled gate
NOT CREATED
```
