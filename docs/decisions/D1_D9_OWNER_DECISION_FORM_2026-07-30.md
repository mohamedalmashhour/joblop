# D1–D9 Owner Decision Form

Status: **UNSIGNED — NO OPTION SELECTED — PROFESSIONAL REVIEW REQUIRED**

Release under review: `f3948579631e1f639c46ba80c0b7f66c94887146`

This form records decisions; it does not make them. The safe default remains active until the
named owner records one option, supporting evidence, policy version and effective date.

| ID | Select one option | Recommended safe default (not selected) | Owner and required evidence | Consequence and affected test |
| --- | --- | --- | --- | --- |
| D1 | ☐ approve versioned forbidden-field allowlist ☐ revise inventory ☐ keep blocked | Keep all non-allowlisted economics out of worker, employer and public DTOs | Product + Privacy/Legal + Contract owner; signed field policy and DTO inventory | Unlocks C1 buyer-economics leak; revision keeps affected responses blocked |
| D2 | ☐ approve route/action/role matrix ☐ revise roles ☐ keep writes governed | Deny authoritative financial writes except named least-privilege capabilities | Product + Finance/Legal + Security; signed create/read/approve/issue/void/refund/settle matrix | Unlocks C2 wrong-role denial and governed write UIs |
| D3 | ☐ approve fee base ☐ approve alternate formula ☐ disable fee | Disable marketplace fee without effective-dated approved formula | Finance + Québec accountant/lawyer; formula, tax flags, contract authority and vectors | Unlocks C4 commission excludes tax and fee activation |
| D4 | ☐ approve merchant/payer/settlement model ☐ revise model ☐ manual collection only | Never mark paid without authoritative settlement evidence | Legal + Accounting + payment owner; entity diagram and reconciliation source | Unlocks C5 paid-with-settlement and external collection |
| D5 | ☐ approve test/production account boundary ☐ revise classifier ☐ keep Stripe disabled | Reject test references in production and keep external provider disabled | Security + Stripe account owner; account inventory, reference formats, secret references and negative vectors | Unlocks C5b production rejection and Stripe staging evidence |
| D6 | ☐ approve Québec tax policy ☐ approve tax-not-enabled ☐ keep issuance blocked | Block production issuance when jurisdiction, registration or place of supply is unknown | Québec accountant/lawyer; registrations, supply classification, policy version and vectors | Unlocks C6 fail-closed jurisdiction and legal invoice activation |
| D7 | ☐ approve authoritative terms source ☐ revise versioning ☐ keep registration/issuance blocked | Freeze issued snapshots and require approved immutable terms references | Contract owner + Legal; checksum, effective date, acceptance and supersession rules | Unlocks C7 issued terms frozen and approved registration terms |
| D8 | ☐ prohibit all overrides ☐ approve restricted override ☐ keep default denial | Deny double booking with no override | Operations + Legal + Security; roles, reason codes, expiry and review if override chosen | Unlocks C8 no double booking and any override UI |
| D9 | ☐ approve retention/hold schedule ☐ revise schedule ☐ deny deletion indefinitely | Append only; deny deletion while retention/legal hold is unknown | Privacy + Accounting + Security; record-class schedule, hold authority and deletion proof | Unlocks C9 append-only audit and evidence-retention operations |

## Decision record

For each selected decision record: decision ID, selected option, owner name/title, professional
reviewer where required, evidence reference, policy/version identifier, jurisdictions, effective
date, approved examples, rejected examples and release SHA.

Owner signature: ____________________  Date: __________

Professional reviewer(s): ____________________  Date: __________

An overall signature without a selected option and evidence for each decision does not activate a
gate.
