# Resident Job

## Page 053 - Ratings Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_053_RATINGS_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 054:** Messages unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 053 as the governed Ratings page. The revision keeps the original
page purpose and layout intent, but makes the rating lifecycle, fairness rules, privacy
boundaries, moderation limits, appeal boundaries, aggregate display rules, auditability, and AI
limits explicit enough to freeze the page as Approved Wireframe v1.0.

No architecture, navigation, implementation, database, API, moderation engine, messaging engine,
or rating engine changes are introduced.

---

## 2. Rating Eligibility Governance

The rating entry area must show a governed eligibility checklist before any rating action appears.

Eligibility must be represented as independent gates:

```text
Eligible interaction exists
-> Interaction completed
-> Rating window open
-> Authorized rater
-> Rating not previously submitted
-> Policy restrictions checked
-> Rating available
```

The page must clearly distinguish:

```text
Completed interaction != Automatic rating
Timesheet approved != Rating published
```

If any gate fails, the interface shows the reason category and next available action, if any. It
must not imply that every completed shift automatically creates a public rating opportunity.

---

## 3. Rating Lifecycle Truthfulness

Ratings must move through visible lifecycle states:

- not eligible
- eligible
- draft
- submitted
- pending moderation
- published
- responded
- appealed
- hidden
- removed
- expired
- unavailable

The lifecycle must communicate:

```text
Submitted != Published
Published != Verified fact
Removed != Deleted from audit history
Expired != User punished
Unavailable != Poor reputation
```

Every status message must explain what happened and what the user can do next without revealing
restricted moderation, investigation, or private operational details.

---

## 4. Mutual-Rating Fairness

The page must separate three rating directions:

- employer rating worker
- worker rating employer
- worker rating workplace or shift experience

Mutual rating logic must communicate:

```text
One submitted rating != Immediate visibility of the other
One party != Authority over the other party's rating
Worker feedback != Employer feedback
Employer feedback != Worker feedback
```

Where policy requires blind or delayed publication, the wireframe must show that visibility is
governed. One side cannot edit, suppress, force, or retaliate against the other side's feedback.

---

## 5. Retaliation Protection

The page must display a compact safety note explaining that ratings cannot be used automatically
to punish users for protected operational activity.

Protected activity examples include:

- safety reports
- complaints
- attendance disputes
- timesheet disputes
- payment disputes
- accessibility requests
- declined changed terms
- participation in investigations

The interface must clarify:

```text
Complaint != Poor rating justification
Dispute != Permission for retaliation
Low rating != Automatic penalty
Rating feedback != Disciplinary decision
```

Any pattern that suggests retaliation belongs to a governed review path outside Page 053.

---

## 6. Rating Truthfulness

Ratings are subjective feedback connected to governed interactions. The page must never present a
rating as an authoritative platform finding.

The wireframe must repeat this boundary near rating submission, rating display, and aggregate
rating areas:

```text
Rating != Verified fact
Rating != Compliance finding
Rating != Employment decision
Rating != Attendance record
Rating != Payment record
Rating != Investigation outcome
```

Ratings may inform future human review where policy allows, but they do not create automatic
eligibility, ranking, discipline, payment, or assignment consequences.

---

## 7. Moderation Boundary

Page 053 may show moderation states, but it does not own moderation implementation or final
investigation decisions.

Allowed moderation states:

- pending moderation
- human review required
- hidden during review
- published
- removed from display
- restored
- closed

The page must clarify:

```text
Flagged != Violation proven
Hidden != Deleted
Removed from display != Removed from audit history
Moderation != Investigation
Moderation != Discipline
```

Page 053 must not own fraud adjudication, legal review, complaint resolution, disciplinary
actions, or employment decisions.

---

## 8. Appeal Boundaries

Appeal and review states must be shown as a governed status flow:

```text
Appeal requested
-> Review pending
-> Evidence requested where permitted
-> Decision made
-> Restored / remains hidden / removed / closed
```

The page must clarify:

```text
Appeal requested != Rating removed
Appeal review != Complaint investigation
Appeal outcome != Employment decision
```

Appeal views must not expose confidential evidence, private complaints, resident or patient
information, or restricted investigation notes.

---

## 9. Aggregate Ratings

Aggregate ratings must show enough context to prevent misleading interpretation.

Every aggregate display should include:

- average or distribution, where permitted
- rating count
- minimum sample threshold status
- period or freshness
- excluded or hidden-rating indicator where permitted
- reliability warning for small samples

The page must clarify:

```text
Average != Ranking
Small sample != Reliable reputation
No ratings != Poor reputation
Aggregate feedback != Worker approval
Aggregate feedback != Employer approval
```

If the configured privacy or reliability threshold is not met, the aggregate remains suppressed or
shown as unavailable rather than implying a negative signal.

---

## 10. Hidden Reputation Scores Prohibited

Page 053 explicitly prohibits hidden reputation mechanics.

The wireframe must not introduce:

- hidden worker trust scores
- hidden employer trust scores
- automated reputation scores
- hidden ranking
- automatic visibility penalties
- automatic eligibility penalties
- automatic assignment suppression
- secret AI reputation conclusions

Any future reputation or scoring model requires separate governance and cannot be smuggled into the
Ratings page.

---

## 11. Privacy

Ratings must use minimum necessary information.

Never expose through ratings:

- identity documents
- banking details
- tax identifiers
- health information
- private addresses
- precise location history
- resident or patient information
- private complaints
- investigation notes
- unrelated personal information

Worker, employer, support, moderator, and auditor views must remain role-specific. The page may
show a rating interaction reference, but it must not expose confidential facility notes or private
worker profile details.

---

## 12. Permissions

Permissions must be represented as separate capabilities:

- submit rating
- view own submitted rating
- view received rating
- respond where permitted
- flag rating
- moderate rating
- appeal moderation outcome
- view aggregates
- view audit history where authorized

The page must clarify:

```text
Visibility != Moderation authority
Moderation authority != Disciplinary authority
Audit access != Edit access
Response access != Suppression access
```

Permissions depend on role, organization, interaction, rating state, moderation state, and policy.

---

## 13. Auditability

The rating lifecycle must preserve an auditable trail for governed state changes.

Conceptual audit events include:

- eligibility evaluation
- draft creation
- submission
- publication
- response
- flag
- moderation state change
- appeal request
- appeal decision
- restoration
- removal from display
- aggregate recalculation

Audit metadata should conceptually include:

- actor
- role
- timestamp
- rating reference
- interaction reference
- prior state
- resulting state
- reason category

Private comment contents should not be broadly exposed in audit views. Auditability protects
governance; it does not create unrestricted visibility.

---

## 14. AI Boundary

AI may assist users by:

- explaining rating criteria
- suggesting clearer wording for a user to review
- identifying prohibited personal information before submission
- summarizing visible aggregate ratings
- explaining moderation states
- suggesting navigation to support or messages where appropriate

AI must never:

- create ratings
- assign scores
- rank users
- infer misconduct
- publish ratings
- remove ratings
- decide appeals
- fabricate feedback
- retaliate
- expose restricted information
- create hidden reputation conclusions

AI suggestions must remain visibly separate from user-submitted ratings and official moderation
states.

---

## 15. Messages Boundary

Page 053 owns:

```text
Ratings
```

Page 054 owns:

```text
Messages
```

Ratings may reference a completed interaction and may route a user toward a future message or
support path, but Page 053 must not become a conversation inbox, support thread, complaint workflow,
or message-composition workflow.

No Page 054 files are created by this revision.

---

## 16. Updated Screen Hierarchy

1. Rating eligibility and interaction summary
2. Rating lifecycle status
3. Rating form or view-only state
4. Mutual-rating fairness note
5. Retaliation and truthfulness reminders
6. Privacy-safe written feedback area
7. Moderation or appeal state where applicable
8. Aggregate ratings with thresholds and freshness
9. AI guidance panel with explicit limits
10. Messaging handoff placeholder for Page 054

Mobile order prioritizes:

1. eligibility
2. status
3. available action
4. privacy and safety reminders
5. submission or appeal path
6. aggregate context

---

## 17. Validation

Confirmed:

- Frozen title remains Ratings.
- Pages 001-052 remain unchanged.
- Page 054 remains Messages.
- No Page 054 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No rating engine created.
- No moderation implementation created.
- No messaging implementation created.
- No AI automation created.
- Unrelated app changes remain untouched.

---

## 18. Final Status

```text
Page 053 — Ratings
Revision 1: COMPLETE
Approval eligibility: SATISFIED

Page 054 — Messages
UNBLOCKED AFTER APPROVAL
NOT CREATED
```
