# JobLop — employment/tax counsel review brief (Québec)

**Purpose:** what Québec employment + tax counsel needs to confirm, and the legal text we need
back, before JobLop can launch. The platform is a **job marketplace** operated by **9375-7649
Québec Inc.** The engineering treats classification as a signed, immutable election; the legal
substance is your call.

**This is not legal advice** — it's a request for yours. Nothing is live: no worker is onboarded to
a real contract, no money moves, no filing happens.

---

## 1. The core question
JobLop wants workers to be **independent contractors (travailleurs autonomes)**, not employees,
because it is a marketplace rather than a placement agency. Today the platform sets a governed rate
and dispatches jobs; a **dynamic-offer engine** is being added so workers see variable offers and
accept or decline terms (strengthening arm's-length substance).

**We need you to confirm:** given how the platform actually operates, is the independent-contractor
classification defensible under the CRA, Revenu Québec, and **CNESST** tests (control, ownership of
tools, financial risk, chance of profit, integration)? If not, what has to change — in the contract or
in the product — to make it hold?

## 2. The legal documents we need from you
The system already references these by version; it needs the actual counsel-drafted text to attach to
each worker's signed election (`WORKER_AGREEMENT_VERSIONS` in
`apps/api/src/workerClassificationElection.ts`):

| Document | Current version tag | What we need |
|---|---|---|
| Independent-contractor agreement (CNESST-based) | `cnesst-contractor-contract-2026.10` | full French + English contract text |
| Employee work agreement (CNESST-based) | `cnesst-employee-contract-2026.10` | full French + English contract text (for genuine-employment cases) |
| Platform Terms of Service | *(none — profile field null)* | version string + text |
| Privacy Policy (Loi 25 / Law 25 compliant) | *(none — profile field null)* | version string + text |

The Terms and Privacy versions are a hard launch gate: the Canada country profile cannot be activated
until `legalTermsVersion` and `privacyTermsVersion` are set (`countries/canada/src/profile.ts`).

## 3. Specific points to rule on
1. **CNESST coverage / workers' comp:** must the platform register and cover workers? Does the answer
   differ between the contractor and employee channels?
2. **The classification questionnaire:** we capture CRA/RQ factor answers (control, tools, risk,
   profit, integration) at election time as the determination basis. Is that the right factor set, and
   is capturing it advisable or a liability?
3. **Reclassification:** a worker's status can only change through a governed, logged, re-signed event
   (never a silent toggle). Confirm that matches your expectation.
4. **Language law (Charter of the French Language / Bill 96):** confirm French-first contract +
   interface obligations; we ship FR/EN.
5. **Law 25 (privacy):** confirm the privacy policy + consent flow meet Québec requirements.
6. **Platform liability** for worker acts at a client site — what the contract must disclaim/insure.

## 4. What's already true (engineering, so your text drops straight in)
- A worker **cannot accept a job** until an active, signed election exists.
- The election is **append-only** — a change writes a new row and supersedes the prior; full history is
  retained with who elected, who approved, the agreement version, and the signature/document reference.
- The system is bilingual (FR/EN) end to end.

*Design references: `docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md` (channels + classification),
`docs/finance/CPA_REVIEW_BRIEF.md` (the tax side, for coordination with the CPA).*
