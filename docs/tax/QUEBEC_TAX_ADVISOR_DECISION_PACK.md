# Québec Tax Advisor Decision Pack — Resident Workforce OS

**Status:** DRAFT for owner review, then for a qualified Québec accountant/lawyer to complete and sign.
**Prepared for:** `[Legal entity name]` (`[GST registration # ]` / `[QST registration #]` — fill in directly; do not send these to third parties who don't need them)
**Purpose:** Obtain signed, effective-dated rulings on the tax treatment the platform must implement before any production invoicing.

> **Important:** This document does **not** contain tax advice. Every item below is a *question with options* for a qualified Québec tax professional to rule on. The platform will be configured strictly to the advisor's signed answers. Where a summary of the business is given, please **correct it if inaccurate** — the rulings depend on the facts being right.

---

## 1. Business & supply summary (advisor: please confirm or correct)

- Resident Workforce OS is an **HR / staffing-dispatch marketplace**. Employers post job/staffing requests; workers receive offers and assignments; the platform records attendance, timesheets and related documents.
- **The platform's revenue is a marketplace / service fee charged to the employer.** (Effective-dated per employer contract; calculated independently of any payment provider's cost or method.)
- **The platform does NOT process payroll or worker payments.** Payment records do not control or effect worker payout, and no employment-classification decision is made in software.
- The platform **issues invoices to employers** (invoice, PDF, audit, and credit-note flows exist).
- Existing internal rule **"D3 — commission base excludes tax"** assumes the marketplace fee is computed on a base that *excludes* tax; this needs your confirmation.

**Q1.1** Is the above an accurate description of the taxable supply(ies)? ☐ Yes ☐ No — corrections: _______________________________

**Q1.2** Is there **more than one** distinct supply for tax purposes (e.g., the marketplace fee vs. any pass-through amounts)? ☐ Single supply ☐ Multiple — list: _______________________________

---

## 2. Decisions requiring a signed ruling

For each: circle/☑ the option, add conditions, and initial. "Effective date" is the date the configuration becomes authoritative in the system.

### D-A — Place of supply
For the **employer marketplace fee**, where is the supply deemed made, and which taxes apply, for each customer situation?

| Customer situation | GST (5%)? | QST (9.975%)? | Zero-rated / exempt? | Notes / conditions |
|---|---|---|---|---|
| Employer located in **Québec** | ☐ | ☐ | ☐ | |
| Employer elsewhere in **Canada** (by province) | ☐ | ☐ | ☐ | (specify HST provinces) |
| Employer **outside Canada** | ☐ | ☐ | ☐ | |

Ruling basis (place-of-supply rule relied on): _______________________________ Initials: ____ Effective date: ______

### D-B — Invoice issuer & registration display
**Q-B.1** Which legal entity is the **issuer of record** on invoices? `[__________]`
**Q-B.2** Exact required presentation of **GST# and QST#** on invoices (label text, placement, format): _______________________________
**Q-B.3** Any mandatory invoice fields for QC compliance beyond registration numbers (e.g., specific wording, bilingual requirements)? _______________________________
Initials: ____ Effective date: ______

### D-C — Tax base (confirms internal rule D3)
**Q-C.1** Is the marketplace fee (the taxable amount) computed on a base that **excludes** tax? ☐ Yes ☐ No — correct formula: _______________________________
**Q-C.2** Are any amounts **out of scope / excluded** from the tax base (e.g., disbursements, reimbursements)? List: _______________________________
Initials: ____ Effective date: ______

### D-D — Corrections, credit notes & refunds
**Q-D.1** Required treatment for **credit notes / refunds / adjustments** (tax reversal rules, timing, documentation): _______________________________
**Q-D.2** Handling of **bad debt / uncollected** invoices for tax purposes: _______________________________
Initials: ____ Effective date: ______

### D-E — Rounding & rate management
**Q-E.1** Rounding rule for tax amounts (per line vs. per invoice; direction): _______________________________
**Q-E.2** Who is accountable for updating rates if GST/QST rates change, and how are effective dates handled? _______________________________
Initials: ____ Effective date: ______

### D-F — Worker-side classification (legal, affects scope)
The platform excludes payroll, but the **independent-worker vs. employee** legal model can affect what (if anything) is a taxable supply on the worker side.
**Q-F.1** Confirm no worker-side amount flows through the platform that would be a taxable supply. ☐ Confirmed ☐ Exceptions: _______________________________
**Q-F.2** Any tax obligation triggered by the worker-classification model that must be reflected in invoicing or reporting? _______________________________
Initials: ____ Effective date: ______

### D-G — Registration & remittance operational facts (owner-provided, advisor-confirmed)
**Q-G.1** GST registration #: `[____________]`  QST registration #: `[____________]` (owner fills; advisor confirms they are active and correct for the issuer entity)
**Q-G.2** Filing frequency and remittance responsibility owner: _______________________________
Initials: ____ Effective date: ______

---

## 3. Advisor attestation

I am qualified to advise on Québec (and applicable Canadian) sales-tax matters, and the rulings above reflect my professional determination for the entity and supplies described (as corrected in §1).

Name: _______________________  Firm / licence #: _______________________
Signature: _______________________  Date: ______________

---

## 4. What the engineering team implements once this is signed (no advisor action needed)

For reference only — this is what gets built from your signed answers; it is **not** part of what you decide:

1. Tax-engine configuration (the platform integrates **Stripe**; **Stripe Tax** supports registration-based GST/QST calculation) driven by the place-of-supply matrix in **D-A**, with GST/QST registration numbers loaded as secrets (values never leave your control).
2. Invoice templates rendering issuer + registration numbers per **D-B**.
3. Marketplace-fee/tax-base formula per **D-C**, with effective-dated vectors.
4. Credit-note / refund tax handling per **D-D**; rounding per **D-E**.
5. **Test evidence**: calculation vectors and generated invoices proving correct GST/QST across the QC / rest-of-Canada / outside-Canada scenarios, matched to the signed rulings and effective dates.

Nothing is activated against live payments or real invoicing until every gate (A–G) is complete and you give a separate, explicit production go-live decision.
