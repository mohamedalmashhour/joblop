# Page 019 - Licenses Product Design Review Revision 1

Status: Complete
Epic: Epic 3 - Worker Portal
Page: 019 - Licenses
Reviewed artifact: PAGE_019_LICENSES_WIREFRAME_REVISION_1.md
Implementation: Not authorized

## 1. Executive Summary

Revision 1 resolves the documented owner conditions. The Licenses page now separates record state,
platform review state, and licence validity; strengthens expiry and unknown-validity handling;
protects licence identifiers; limits employer visibility; and avoids unsupported legal-authority
claims.

Recommendation: APPROVE PAGE 019 AS APPROVED WIREFRAME v1.0.

## 2. Summary of Changes

- Added three independent licence dimensions:
  - Worker record state.
  - Platform review state.
  - Licence validity.
- Added explicit truth statements for submitted, reviewed, verified, valid, worker-approved, and
  assignment-approved states.
- Strengthened expiry handling with exact expiry date, expiring-soon, expired, renewal action,
  replacement evidence, last review date, and unknown-validity warning.
- Added licence-number privacy rules and default masking.
- Clarified employer visibility as role- and assignment-specific.
- Added unsupported verification language restrictions.
- Added jurisdiction and regulated-role boundaries.
- Strengthened supporting-document, correction, rejection, AI, mobile, and accessibility rules.

## 3. Updated Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Record/review/validity separation | 9.9 | Three licence dimensions are independent. |
| Expired-licence safety | 9.9 | Expired cannot appear active because of earlier review. |
| Employer visibility | 9.8 | Employer access is role- and assignment-specific. |
| Identifier masking | 9.8 | Full licence numbers are protected by default. |
| Verification truthfulness | 9.9 | Unsupported legal-authority language is excluded. |
| Jurisdiction neutrality | 9.8 | Requirements and formats remain configurable. |
| Correction experience | 9.7 | Plain-language correction and safe rejection paths are included. |
| AI boundaries | 9.9 | AI cannot verify, approve, reject, or infer legal authority. |
| Accessibility | 9.6 | Text labels, screen-reader behavior, error association, and keyboard access included. |
| Mobile usability | 9.6 | Mobile highlights review state, validity, expiry, and required action. |
| Consistency with Pages 017 and 018 | 9.8 | Preserves approved profile/professional governance patterns. |
| Legal-authority risk control | 9.9 | Platform review does not replace issuing authority. |
| Overall | 9.8 | Ready for approval. |

## 4. Owner Condition Review

### 1. Separate the Three Licence Dimensions

Resolved.

Every licence record shows:

- Worker record state.
- Platform review state.
- Licence validity.

The revision explicitly states these must not collapse into one status.

### 2. Strengthen Expiry Handling

Resolved.

The revision includes exact expiry date where known, expiring-soon status, expired status, renewal
action, replacement evidence, last review date, unknown-validity warning, and no invented universal
grace period or renewal timeline.

Expired licences cannot appear operationally valid because an earlier review was successful.

### 3. Licence-Number Privacy

Resolved.

Default licence identifier display is masked. Full identifiers are restricted to the worker,
specifically authorized review staff, or legally authorized operational users where required.

### 4. Employer Visibility

Resolved.

Employer-visible information is role- and assignment-specific. Employers do not receive
unrestricted access to full licence numbers, uploaded evidence, private notes, rejection history,
correction history, or internal audit information.

### 5. Verification Language

Resolved.

Unsupported terms are prohibited, including certified professional, fully licensed, legally
approved, platform-approved practitioner, and eligible for all work.

Verification unavailable remains its own truthful state.

### 6. Jurisdiction and Regulated-Role Boundary

Resolved.

The revision states that requirements vary by jurisdiction, a licence may be valid only for a
specific region, one licence may not authorize every task, platform review does not replace the
issuing authority, and assignment eligibility may require additional checks.

### 7. Supporting-Document Boundary

Resolved.

The revision shows:

```text
Licence record
→ Supporting document reference
→ Documents workflow
```

The page references evidence but does not become document storage.

### 8. Correction and Rejection Experience

Resolved.

Correction-required states include reason, affected field/document, requested action, resubmission
path, support path, and last update. Rejected states use safe factual language where permitted,
hide internal reviewer notes, distinguish rejection from expiry, and preserve audit history.

### 9. AI Boundary

Resolved.

AI can identify missing fields, flag inconsistent dates, detect duplicates, remind about expiry,
and suggest standard categories. AI cannot verify authenticity, determine legal practice authority,
approve/reject licences, infer eligibility, contact regulators without approved future workflow,
edit data without confirmation, or make final assignment decisions.

### 10. Accessibility and Mobile

Resolved.

Mobile distinguishes review state, validity state, expiry date, and required action with clear text
labels. High-priority actions include Renew, Correct information, Link evidence, and View review
status.

## 5. Risk Review

| Risk | Current Assessment | Status |
| --- | --- | --- |
| Record/review/validity collapse into one badge | Three dimensions added | Controlled |
| Expired licence appears valid | Expiry safety strengthened | Controlled |
| Full licence number exposed | Masking rule added | Controlled |
| Employer access too broad | Assignment-specific visibility added | Controlled |
| Upload appears to verify licence | Supporting-document boundary reinforced | Controlled |
| Jurisdictional authority implied | Regulated-role boundary added | Controlled |
| AI appears to verify or approve | AI boundary reinforced | Controlled |

## 6. Required Improvements

No remaining required wireframe improvements are identified.

## 7. Non-Blocking Design Debt

Future enhancements, not blockers:

- Jurisdiction-specific licence templates after legal and compliance approval.
- Regulator lookup after approved workflow and integration governance.
- Employer-facing visibility preview.
- Licence correction timeline view.
- Licence audit timeline after Documents workflow approval.

## 8. Confirmation

- Architecture unchanged.
- Epic 3 Planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Pages 017 and 018 unchanged.
- No implementation started.
- No Page 020 files created.
- Unrelated app changes untouched.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database models created.
- No licence-verification implementation created.
- No deployment performed.
- No production data introduced.

## 9. Recommendation

Page 019 satisfies the documented conditions.

Recommended status:

```text
Page 019 - Licenses
APPROVED WIREFRAME v1.0
```

Page 020 may be unblocked as the next controlled gate after the approval record is created.
