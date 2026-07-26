# Page 032 - Ratings Product Design Review

Status: Product review complete
Page: 032 - Ratings
Epic: Epic 3 - Worker Portal
Reviewed artifact: PAGE_032_RATINGS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 032 Ratings wireframe establishes a careful ratings and feedback experience that treats
ratings as governed records, not as automatic employment, eligibility, discipline, or clinical
competence decisions.

The page is structurally strong, but it should not be approved yet. Ratings can create reputation,
retaliation, privacy, and fairness risk, so the page needs a stronger explicit "rating impact"
section before approval.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

## 2. Strengths

- Worker ratings, employer/residence ratings, private operational feedback, public reputation, and
  internal quality signals are separated.
- Rating eligibility is tied to governed events and not merely shift acceptance or check-in.
- Submission, publication, moderation, and dispute states remain independent.
- Numeric ratings include scale, count, period, rounding, and public/private labels where allowed.
- Written feedback governance prevents resident names, medical details, discriminatory language,
  threats, confidential information, and unsupported allegations.
- Public/private visibility is explicit.
- Anonymity is not overstated.
- Worker response preserves revision and moderation history.
- Retaliation and manipulation risks are acknowledged.
- AI cannot fabricate, publish, remove, rank, decide misconduct, or infer clinical competence.

## 3. Weaknesses

### 3.1 Rating Impact Needs a Dedicated Worker-Facing Explanation

The wireframe says ratings may be one governed input, but it should include a dedicated section
explaining what ratings may and may not affect.

Risk:
Workers may believe one rating automatically blocks work, causes punishment, or changes eligibility.

### 3.2 Retaliation Reporting Needs Stronger Visibility

Retaliation appears in the dispute/fairness model, but workers need a visible path when feedback
feels retaliatory after a safety report, cancellation, support request, or dispute.

Risk:
Workers may not understand that retaliation concerns have a governed review path.

### 3.3 Public Reputation Requires Stronger Publication Consent Language

The wireframe separates private and public states, but it should more explicitly state that public
publication depends on approved policy and visibility rules.

Risk:
Private or operational feedback could be perceived as automatically public.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Ratings appear to prove professional competence | Critical | Avoided, but impact section should be stronger. |
| Single score creates universal eligibility | Critical | Avoided, but needs worker-facing impact explanation. |
| Feedback is published without clear consent and policy | Critical | Mostly avoided; publication consent language should be stronger. |
| Private content can become public silently | Critical | Avoided. |
| Low ratings automatically penalize workers | Critical | Avoided, but should be more visible. |
| Retaliation has no review path | High | Review path exists, needs stronger visibility. |
| Anonymity is overstated | High | Avoided. |
| Removed content loses audit history | High | Avoided. |
| Staff access is unaudited | High | Avoided through auditability requirement. |
| AI can publish, remove, rank, or decide misconduct alone | Critical | Avoided. |
| Resident or protected information can be exposed | Critical | Avoided through written feedback governance. |

## 5. Required Improvements

Before Page 032 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Rating Impact Explanation**
   - Add a dedicated section explaining that ratings may be a governed input, but do not create
     automatic eligibility, automatic punishment, professional authorization, hidden blacklists, or
     misconduct decisions.

2. **Retaliation Concern Path**
   - Add a prominent worker-facing route for retaliation concerns connected to cancellation, safety
     reports, support use, availability, or disputes.

3. **Public Publication Boundary**
   - Strengthen language that private operational feedback, internal safety signals, and submitted
     feedback do not become public reputation unless approved policy and visibility rules allow it.

These are controlled UX and governance clarifications and do not require architecture changes.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Worker versus employer rating separation | 9.7 |
| Rating eligibility | 9.6 |
| Submission/publication/moderation/dispute state separation | 9.8 |
| Numeric rating truthfulness | 9.5 |
| Written feedback governance | 9.8 |
| Public/private visibility | 9.5 |
| Anonymity clarity | 9.7 |
| Worker response | 9.6 |
| Dispute handling | 9.5 |
| Retaliation protection | 9.2 |
| Matching boundary | 9.3 |
| Moderation | 9.6 |
| Removal auditability | 9.8 |
| Privacy | 9.8 |
| Staff access | 9.7 |
| AI governance | 10.0 |
| Mobile usability | 9.4 |
| Accessibility | 9.6 |
| International readiness | 9.8 |
| Consistency with Pages 016-031 | 9.8 |
| Readiness for future history, support, and dispute workflows | 9.5 |
| Overall score | 9.6 |

## 7. Governance Review

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
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

The page is structurally sound and respects fairness, privacy, moderation, and AI boundaries. The
three documented clarifications should be resolved before creating the Page 032 approval record.

## 9. Final Review Status

```text
Page 032 - Ratings
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 033 - Messages
BLOCKED
```
