# Joblop / Resident Workforce OS — Compliance Review Checklist

**Purpose.** This lists every governed assumption currently built into the platform so a
**Quebec employment lawyer** and a **Quebec accountant / payroll specialist** can verify each one
before anything touches real workers, employers or money. It is a review aid, **not legal or tax
advice** — the figures and rules below are engineering defaults chosen during the build and must be
confirmed or corrected by the appropriate professional.

Legend: **[LAW]** employment/tax lawyer · **[ACCT]** accountant/payroll · **[BOTH]**.

Status as of this checklist: the platform is in test mode (synthetic data, no real money moves,
Stripe test keys only).

---

## 1. Money model (hidden markup)

- **Hidden markup.** Employer pays E, worker is paid W < E, platform keeps E − W; neither party sees
  the other's rate. **[LAW]** Confirm this disclosure model is permissible for a staffing
  intermediary in Quebec, and what must nonetheless be disclosed to each party.
- **Default margin 20%** (200,000 ppm), admin-overridable per role within **0%–90%**. **[BOTH]**
  Confirm there is no cap/floor required by law, and that a 90% margin (worker gets 10% of E) is
  acceptable — see minimum-wage item below.
- **Margin applies to the hourly rate AND to funded allowances** (transport/meal/lodging). **[BOTH]**
  Confirm allowances may be marked up this way, and whether any allowance must be passed to the
  worker in full.

## 2. Minimum wage, overtime, premiums

- **Minimum wage is NOT currently enforced on W.** With a high margin, W could fall below the Quebec
  general minimum wage. **[LAW/ACCT] ACTION: confirm the current Quebec minimum wage and whether the
  platform must guarantee W ≥ minimum wage; if so this must be enforced in code before launch.**
- **Overtime, statutory holidays, vacation pay (4%/6%), meal/rest breaks** — confirm how these must
  be computed and whether the current payroll engine handles them. **[ACCT]**
- **6-hour minimum shift**: any shift shorter than 6 h is **billed and paid as 6 h**, and if a worker
  is dismissed early the 6-h minimum is still paid. **[LAW]** Confirm this is lawful and how it
  interacts with reporting-pay / "3-hour rule" obligations.

## 3. Urgent / emergency premium

- **+$5.00/hr** added to **both** E and W for urgent/immediate orders (margin unchanged); the premium
  is **taxed** on the employer invoice. **[ACCT]** Confirm GST/QST applies to the premium, and
  **[LAW]** confirm a flat urgency premium raises no issue.

## 4. Worker classification (the biggest risk)

- Workers self-select **Employee** (source deductions + T4) or **Travailleur autonome / contractor**
  (paid gross, no deductions, T4A). **[LAW] ACTION: this is the highest-risk area.** Confirm the
  legal test for employee vs independent contractor in Quebec (Revenu Québec / CNESST / CCQ as
  applicable), whether worker self-selection is defensible, and the misclassification exposure
  (retroactive deductions, penalties). Confirm who is the legal employer of record.
- **[ACCT]** Confirm T4 vs T4A issuance rules and year-end obligations for each type.

## 5. Payroll deductions & remittances

- The payroll engine computes deductions for employees. **[ACCT] ACTION: verify every current
  deduction RATE and ceiling against the current year** — QPP, EI, QPIP, federal & Quebec income
  tax, CNESST, WSDRF/health-services fund as applicable — and the remittance schedule and
  responsible party. Confirm the engine's figures are not stale.

## 6. Payout to workers

- **Two-week hold then automatic release.** NOTE: the spec is "2 weeks from punch-out," but the
  implementation currently anchors the hold to the **pay-period end** as a practical stand-in.
  **[ACCT/LAW] Confirm the lawful maximum interval between work and payment, and whether the
  pay-period-end anchor satisfies it** (it may need to be punch-out-based).
- **Dispute pauses the payout** until resolved. **[LAW]** Confirm withholding pay pending a dispute
  is permissible and for how long.
- Payout rail intended: **Interac e-Transfer** (not yet integrated). **[ACCT]** No tax impact, but
  confirm record-keeping of payments.

## 7. Taxes & invoicing

- Platform issuer: **9375-7649 Québec Inc.**, **NEQ 1173544397**, contact **info@joblop.com**.
  **[ACCT] ACTION: confirm the GST and QST registration numbers and that they appear on invoices;
  confirm the legal name/address.**
- **GST 5% / QST 9.975%** applied to the billable amount. **[ACCT]** Confirm current rates and that
  the tax base (rate + taxed surcharge + urgency premium + marked-up allowances) is correct.
- **Payment transfer fee**: card **2.9% + $0.30**, split **50/50** employer/platform; **Interac**
  fee absorbed 100% by the platform. The card surcharge is **taxed** and charged upfront. **[ACCT]**
  Confirm surcharging a card fee to the employer is permissible (card-network and Quebec consumer
  rules) and correctly taxed.

## 8. Language (Bill 96 / Charter of the French language)

- Worker and employer apps are **bilingual (fr-CA / en-CA) at full key parity**. The **admin app is
  English-only** (internal tool). **[LAW] ACTION: confirm Bill 96 obligations** — that French is
  offered on terms at least as favourable, that contracts/offers presented to workers and employers
  meet French-first requirements, and whether any internal/admin French obligation applies.
- Confirm the work agreement, offer terms, and any worker-facing notices meet French-language and
  content requirements.

## 9. Contracts & consent

- Employers accept a contract at onboarding; workers accept offer terms. **[LAW]** Review the actual
  contract/terms text (not in this checklist) for enforceability, mandatory clauses, cancellation
  terms, and the duties-scope limitation ("worker performs only listed duties").

## 10. Privacy (Quebec Law 25)

- The platform stores worker and employer personal data, documents, and verification records.
  **[LAW] ACTION: confirm Law 25 obligations** — privacy policy, consent, retention, breach
  reporting, the privacy officer, and cross-border/data-location (the database and any processors).

## 11. Data location & processors

- Payments use **Stripe** (currently test mode). **[LAW/ACCT]** Confirm Stripe as processor is
  acceptable, where data/funds reside, and the money-services/account structure for holding and
  disbursing worker funds (this can trigger its own licensing questions).

---

## How to use this

Give section 2 (minimum wage), section 4 (classification), section 6 (payout timing) and section 10
(Law 25) priority — those carry the most risk and may require code changes before launch. Mark each
item **confirmed / needs change / N/A** and send anything marked "needs change" back so it can be
corrected in the governed code.

*Prepared from the platform's built-in defaults. Not legal or tax advice.*
