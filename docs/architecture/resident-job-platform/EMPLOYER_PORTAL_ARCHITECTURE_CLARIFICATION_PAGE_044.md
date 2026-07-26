# Resident Job

## Employer Portal Architecture Clarification - Page 044

**Status:** Clarification Complete  
**Scope:** Page 044 / Page 045 naming conflict  
**Architecture Changes:** None  
**Implementation:** Not Started  
**Page 044 Created:** No

---

## 1. Purpose

A naming conflict exists between:

- the frozen architecture map
- a previous owner instruction

This document compares two sequencing options without renaming any frozen page, changing page numbers, modifying the architecture, or creating Page 044.

---

## 2. Current Frozen Architecture Evidence

The current frozen page map contains:

```text
Page 044 — AI Worker Suggestions
Page 045 — Applicants
```

This clarification does not change those frozen titles.

---

## 3. Options Under Review

### Option A

```text
Page 044 — AI Worker Suggestions
Page 045 — Shift Marketplace
```

### Option B

```text
Page 044 — Shift Marketplace
Page 045 — AI Worker Suggestions
```

---

## 4. Comparison

| Review Area | Option A: Page 044 AI Worker Suggestions / Page 045 Shift Marketplace | Option B: Page 044 Shift Marketplace / Page 045 AI Worker Suggestions |
| --- | --- | --- |
| Workflow continuity | Stronger after Pages 041-043 because Create Shift, Recurring Shift, and Urgent Shift all lead naturally into recommendations for human review. | Weaker because it moves directly into marketplace exposure before the employer has reviewed explainable suggestions. |
| Employer usability | Better for controlled staffing decisions. Employers first see why certain workers may fit before moving into broader visibility or marketplace behavior. | Faster for publishing but may feel less governed because marketplace exposure appears before advisory review. |
| Staffing efficiency | Strong for qualified matching and review efficiency. AI suggestions can narrow the employer's attention before applications or marketplace exposure. | Strong for broad reach, but less efficient if employers must sort marketplace visibility before seeing recommended candidates. |
| Private invitation flow | Stronger. AI suggestions can support invited-worker or restricted-pool flows before public marketplace exposure. | Weaker. Marketplace-first sequencing may imply broader visibility before private invitation decisions. |
| Marketplace dependency | Lower. AI suggestions can operate as an advisory layer without requiring marketplace behavior to be defined first. | Higher. Shift Marketplace must be designed before recommendation review, increasing dependency on publication and visibility governance. |
| AI governance | Stronger if handled carefully. AI appears as advisory evidence for human review, not publication or assignment. | Riskier. If marketplace is first, AI suggestions may later appear as ranking or marketplace optimization unless boundaries are very strong. |
| Implementation complexity | Lower for the next page because Page 044 already exists in the frozen architecture as AI Worker Suggestions. | Higher because it conflicts directly with the frozen Page 044 architecture title and would require formal change control before proceeding. |
| Future scalability | Strong. Recommendation governance can later support private invitations, applicant review, assignment review, and marketplace visibility. | Moderate. Marketplace-first scaling is possible, but it may blur publication, visibility, matching, and recommendation boundaries. |

---

## 5. Recommendation

**Recommend Option A.**

```text
Page 044 — AI Worker Suggestions
Page 045 — Shift Marketplace
```

Reason:

Option A preserves the current frozen Page 044 title and supports a more governed staffing sequence:

```text
Create / Recurring / Urgent Shift
↓
AI Worker Suggestions
↓
Human Review
↓
Private Invitation / Applicant Review / Marketplace Exposure
```

This sequence is stronger for employer usability, AI governance, staffing efficiency, and private invitation flows. It keeps AI advisory and human-controlled before any broader marketplace visibility is introduced.

---

## 6. Important Governance Note

Option A still conflicts with the current frozen Page 045 title, which is:

```text
Page 045 — Applicants
```

Therefore, this recommendation should not be treated as an automatic rename of Page 045.

Before creating Page 045, the owner should decide through formal change control whether:

- Page 045 remains Applicants, and Shift Marketplace is introduced later; or
- Page 045 is formally changed to Shift Marketplace; or
- Shift Marketplace is added as a new page elsewhere in the Employer Portal sequence.

This document recommends Option A only for the Page 044 sequencing conflict.

---

## 7. Final Decision Support

The best immediate next step is:

```text
Proceed with Page 044 — AI Worker Suggestions
```

Do not create Shift Marketplace on Page 044.

Do not rename Page 044.

Do not alter the frozen architecture map without a separate approved change request.

---

## 8. Validation

Confirmed:

- No page numbers changed.
- No frozen page renamed.
- No existing architecture modified.
- No Page 044 created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No commit, push, merge, or deployment performed.
