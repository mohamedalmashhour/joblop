# Resident Job

## Page 053 - Ratings

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 054:** Messages blocked

---

## 1. Purpose

Page 053 designs the authenticated Ratings experience.

Page 053 governs ratings and feedback connected to completed, eligible platform interactions. It continues from Page 052 - Reports and prepares a governed handoff to the next frozen workflow:

```text
Page 054 — Messages
```

Page 053 may support governed ratings involving:

- employer rating of worker
- worker rating of employer, residence, or shift experience
- role-specific feedback
- rating history
- rating eligibility
- moderation status
- response or clarification paths
- aggregate display where permitted

Page 053 must not:

- allow anonymous or unverified ratings
- permit ratings before the governed interaction is complete
- create hidden reputation scores
- automatically rank workers or employers
- automatically penalize users
- expose private complaints or investigations
- treat ratings as proof of misconduct
- allow retaliation
- permit AI to create, edit, remove, score, or moderate ratings autonomously

---

## 2. Primary Users

Authorized users involved in governed completed interactions:

- employer
- residence manager
- worker
- support where governed
- moderator where authorized
- read-only auditor where authorized

Role, interaction type, completion state, rating window, moderation state, and permission context determine visibility and available actions.

---

## 3. Rating Eligibility

Represent a governed eligibility chain:

- valid assignment or transaction exists
- interaction reached the required completion state
- rating window opened
- user has authority to rate
- rating not already submitted where only one is permitted
- rating window remains active
- no policy restriction applies

Clarify:

```text
Assignment created != Rating eligible
Worker accepted != Rating eligible
Check-in != Rating eligible
Timesheet approved != Automatic rating publication
```

---

## 4. Rating Lifecycle

Represent rating lifecycle states independently:

- not eligible
- eligible
- draft
- submitted
- pending moderation
- published
- response available
- disputed
- hidden
- removed
- expired
- unavailable

Clarify:

```text
Submitted != Published
Published != Verified fact
Disputed != Removed
Removed != Deleted from audit history
```

---

## 5. Rating Dimensions

Represent configurable dimensions rather than one universal score.

Possible dimensions for employer rating worker:

- punctuality
- role readiness
- communication
- professionalism
- shift completion

Possible dimensions for worker rating employer, residence, or shift experience:

- role accuracy
- workplace readiness
- respectful treatment
- communication
- safety
- payment or timesheet experience where governed

Do not hardcode these dimensions as globally valid.

Clarify:

```text
One dimension != Overall character
Low score != Misconduct
```

---

## 6. Written Feedback

Represent:

- optional comment
- structured feedback
- policy reminder
- prohibited-content warning
- review before submission
- character or length limit
- language and locale

Do not allow:

- threats
- discriminatory content
- private personal data
- health information
- banking information
- tax information
- unrelated allegations
- doxxing
- confidential resident information

Do not implement moderation.

---

## 7. Mutual Rating Boundary

Where both sides may rate, preserve independence.

Clarify:

```text
Employer rating != Worker rating
One party submitted != Other party may see it immediately
One rating != Authority over the other rating
```

Consider governed blind or delayed publication where policy requires it.

Do not let one side edit, suppress, or retaliate against the other side's rating.

---

## 8. Retaliation Protection

Ratings must not be used automatically to punish users for:

- reporting safety concerns
- filing complaints
- disputing attendance
- disputing timesheets
- disputing payment
- requesting accessibility support
- declining changed terms
- refusing unrelated work
- participating in an investigation

Clarify:

```text
Complaint != Low rating justification
Dispute != Retaliation permission
Low rating != Automatic disqualification
```

---

## 9. Rating Truthfulness

Ratings represent user opinions within a governed interaction.

Clarify:

```text
Rating != Verified fact
Rating != Compliance finding
Rating != Attendance record
Rating != Payment record
Rating != Employment decision
```

The UI must distinguish subjective feedback from authoritative platform records.

---

## 10. Moderation Boundary

Represent high-level states only:

- automated safety screening pending where governed
- human review required
- under review
- published
- hidden
- removed
- appealed
- restored
- closed

Page 053 must not own:

- investigation
- fraud adjudication
- legal review
- disciplinary action
- complaint resolution

Clarify:

```text
Flagged != Policy violation proven
Hidden != Removed permanently
```

---

## 11. Appeal and Dispute

Represent:

- appeal requested
- review pending
- evidence requested
- decision made
- restored
- remains hidden
- removed
- closed

Clarify:

```text
Appeal requested != Rating removed
Disputed rating != Rating false
```

Do not expose private evidence or investigation notes.

---

## 12. Aggregate Ratings

Represent governed aggregation with:

- average
- distribution
- count
- period
- eligible-rating count
- suppressed or excluded count where appropriate
- freshness
- confidence or minimum sample threshold

Clarify:

```text
Average != Ranking
Small sample != Reliable reputation signal
No rating != Poor rating
```

Do not display averages below configured privacy or reliability thresholds.

---

## 13. Hidden Reputation Scores

Do not create or imply:

- secret worker scores
- secret employer scores
- trust scores
- automatic risk scores
- hidden ranking
- automated eligibility penalties
- automated visibility suppression

Any future scoring model requires separate governance and owner approval.

---

## 14. Permissions

Represent separate authority for:

- submit rating
- view own submitted rating
- view received rating
- respond
- flag
- moderate
- appeal
- view aggregate
- audit

Clarify:

```text
Rating visibility != Moderation authority
Moderation authority != Disciplinary authority
Audit access != Permission to expose private comments
```

---

## 15. Privacy

Display only minimum necessary information.

Do not expose:

- private identity details
- home address
- banking information
- tax identifiers
- health information
- complaints
- investigation notes
- unrelated work history
- resident or patient information
- precise location history

Use role-appropriate display names and interaction references.

---

## 16. Auditability

Conceptually preserve:

- eligibility created
- draft saved where supported
- rating submitted
- moderation started
- rating published
- response submitted
- rating flagged
- rating hidden
- rating removed
- appeal requested
- appeal resolved
- rating restored
- aggregate recalculated

Include:

- actor
- role
- timestamp
- rating reference
- interaction reference
- prior state
- resulting state
- reason or policy category where applicable

Do not broadly log private comment contents.

---

## 17. AI Boundary

AI may:

- explain rating criteria
- suggest respectful wording
- identify potentially prohibited personal information before submission
- summarize visible aggregate ratings
- explain moderation status
- suggest navigation

AI must not:

- create ratings automatically
- assign scores
- rank users
- infer misconduct
- publish or remove ratings
- decide appeals
- retaliate
- fabricate feedback
- expose restricted information

Human-authored ratings must remain clearly distinguishable from AI assistance.

---

## 18. Reports Boundary

Page 052 may report governed aggregates.

Page 053 owns:

- rating eligibility
- rating submission
- rating-specific lifecycle
- rating response
- rating moderation status
- rating appeal state
- rating aggregation rules

Clarify:

```text
Ratings report != Ratings workflow
Report aggregate != Authority to edit ratings
```

---

## 19. Information Architecture

### Desktop Structure

```text
Employer / Worker Shell
├── Header
│   ├── Ratings
│   ├── Role context
│   ├── Interaction reference
│   └── Eligibility state
│
├── Eligible interactions
│   ├── Completed interaction reference
│   ├── Rating window state
│   ├── User authority to rate
│   └── Policy restriction state
│
├── Rating form / detail
│   ├── Configurable dimensions
│   ├── Optional comment
│   ├── Conduct notice
│   ├── Review before submission
│   └── Confirmation before final submission
│
├── Rating history
│   ├── Submitted ratings
│   ├── Received ratings
│   ├── Response state
│   ├── Moderation state
│   └── Appeal / flag state
│
├── Aggregate summary
│   ├── Average where permitted
│   ├── Distribution
│   ├── Count
│   ├── Period
│   ├── Threshold state
│   └── Freshness
│
└── Governance panel
    ├── Rating truthfulness
    ├── Retaliation protection
    ├── Privacy
    ├── Permissions
    ├── Auditability
    ├── AI limitations
    └── Messages handoff
```

### Mobile Structure

```text
Ratings
├── Interaction reference
├── Rating eligibility
├── Dimension controls
├── Optional comment
├── Privacy and conduct notice
├── Submit action
├── Moderation status
├── Received-rating summary
├── Appeal or flag action
└── Messages handoff
```

Mobile must prioritize:

```text
Am I eligible to rate?
What interaction am I rating?
What can I safely say?
What happens after submission?
How do I flag or appeal?
```

Avoid manipulative rating prompts.

---

## 20. Empty and Error States

Include:

- not eligible to rate
- rating window not open
- rating window expired
- already rated
- no ratings received
- rating pending moderation
- rating hidden
- aggregate unavailable
- insufficient sample
- appeal pending
- access denied
- service unavailable

Do not fabricate ratings or averages.

---

## 21. Accessibility

Review:

- semantic rating headings
- keyboard-accessible rating controls
- screen-reader-friendly scale labels
- no color-only rating meaning
- text alternatives for icons
- accessible comment validation
- accessible moderation and appeal states
- focus management
- sufficient contrast
- plain-language policy guidance
- confirmation before final submission

---

## 22. International Readiness

Do not hardcode:

- rating scale
- rating dimensions
- publication timing
- moderation policy
- appeal period
- retention period
- anonymity model
- locale
- language
- worker classification
- employer model
- protected grounds
- reputation terminology

Keep jurisdiction, organization, residence, role, rating policy, scale, dimensions, locale, moderation policy, and retention configurable.

---

## 23. Page 054 Boundary

Exact frozen Page 054 title:

```text
Page 054 — Messages
```

Source:

- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`
- `docs/architecture/resident-job-platform/pages/PAGE_054_MESSAGES.md`

Page 053 owns:

```text
Ratings
```

Page 054 owns:

```text
Messages
```

Page 053 may route rating-related communication to future messaging workflows where authorized, but it must not create messaging, conversations, notifications, complaint resolution, investigation workflows, or support case management.

---

## 24. Validation

Confirmed:

- Phase 06 assessment remains READY.
- Pages 001-052 remain unchanged.
- Exact Page 054 frozen title identified as Messages.
- No Page 054 files created.
- No Page 053 approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No rating engine created.
- No moderation implementation created.
- No appeal implementation created.
- No reputation scoring created.
- No reporting implementation created.
- No AI rating automation created.

---

## 25. Final Status

```text
Page 053 — Ratings
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 054 — Messages
BLOCKED
```
