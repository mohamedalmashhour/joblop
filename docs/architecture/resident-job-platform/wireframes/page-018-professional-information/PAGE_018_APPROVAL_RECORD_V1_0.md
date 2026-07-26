# Page 018 - Professional Information Approval Record v1.0

Status: APPROVED WIREFRAME v1.0
Epic: Epic 3 - Worker Portal
Page: 018 - Professional Information
Approval date: 2026-07-22
Implementation: Not authorized

## 1. Approved Scope

Page 018 is approved as the authenticated worker professional-information experience.

Approved purpose:

- Allow workers to present professional background.
- Record work experience.
- Record preferred roles.
- Record skills and specialties.
- Record education and training.
- Record employment preferences.
- Distinguish editable, reviewed, and verified-elsewhere information.
- Preserve privacy and employer-visibility boundaries.

## 2. Approved References

- Architecture reference: `PAGE_018_PROFESSIONAL_INFORMATION.md`
- Initial wireframe: `PAGE_018_PROFESSIONAL_INFORMATION_LOW_FIDELITY_WIREFRAME.md`
- Product Design Review: `PAGE_018_PROFESSIONAL_INFORMATION_PRODUCT_DESIGN_REVIEW.md`
- Approved revision: `PAGE_018_PROFESSIONAL_INFORMATION_WIREFRAME_REVISION_1.md`
- Revision review: `PAGE_018_PROFESSIONAL_INFORMATION_PRODUCT_DESIGN_REVIEW_REVISION_1.md`
- Architecture baseline: Resident Job Architecture Phase 1 v1.0
- UX baseline: Resident Job UX Foundation
- Epic planning baseline: Epic 3 Worker Portal Planning v1.0

## 3. Approval Basis

Page 018 is approved because Revision 1 resolved the documented conditions:

- Professional Summary, Work Experience, Education, Skills & Specialties, Languages, Work
  Preferences, and Verification Status are separated.
- Every professional section carries a review-state model.
- Self-reported information cannot be mistaken for verified information.
- Employer visibility is explicit and limited.
- Preferences are non-binding and affect recommendations only.
- AI cannot invent, verify, approve, or silently change professional information.
- Sensitive supporting documents remain in the Documents workflow.

## 4. Status

```text
Page 018 - Professional Information
APPROVED WIREFRAME v1.0
```

## 5. Implementation Boundary

This approval does not authorize:

- React implementation.
- Frontend implementation.
- Backend implementation.
- APIs.
- Database models.
- Credential verification implementation.
- Licence verification implementation.
- Employment approval.
- Payroll or compensation calculation.
- Deployment.
- Production data.

## 6. Future Notes

Future design or implementation work must preserve:

- Self-reported experience does not mean verified employment history.
- Self-reported education does not mean verified qualification.
- Selected role does not mean approved eligibility.
- Preferences are not guarantees, approvals, assignments, or pay commitments.
- Employers do not receive unrestricted profile access.
- Sensitive documents remain in the Documents workflow.

Any change to the approved Page 018 wireframe requires formal revision control.

## 7. Next Gate

Page 019 - Licenses is unblocked as the next controlled wireframe gate.

No Page 019 work may begin outside the established governance lifecycle.
