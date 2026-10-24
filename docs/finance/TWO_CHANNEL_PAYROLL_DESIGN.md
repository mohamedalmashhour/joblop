# Two-channel pay (employee / independent) + accounting — design

**Status:** Design / plan. Build in phases. **Money execution and tax filing stay OFF** behind a
go-live gate until a qualified Québec CPA signs off on the model, the rates, and the classification
method. This document is engineering design, not tax or legal advice.

**Owner decisions (2026-10-24):**
- JobLop is a **job marketplace, not a placement/staffing agency** → the primary channel is the
  **independent worker (contractor, T4A)**: paid gross, handles own taxes. The employee/payroll
  channel stays built for cases that genuinely are employment.
- The worker signs the **CNESST-based contract** (`WORKER_AGREEMENT_VERSIONS` reference it); the
  contract text is a legal document attached per election. CNESST coverage/registration is a launch
  requirement handled outside the code.
- The **CPA reviews the model when the platform is ready** — until then everything is synthetic and
  the `FINANCE_LIVE` gate stays closed (nothing files, nothing pays).
- Caveat still in force: classification is decided by SUBSTANCE (CRA/Revenu Québec/CNESST tests), not
  the label — a contractor marketplace holds up only if the working relationship is genuinely
  arm's-length. Confirm with Québec employment/tax counsel before go-live.

**Why:** A worker on JobLop is paid through one of two legally distinct channels, and the Canada
Revenue Agency / Revenu Québec treat them very differently. Getting the channel wrong (or letting it
drift) exposes the platform to back-remittances, a 10–20% penalty, interest, and director personal
liability (ITA s.227.1). So the channel must be **chosen once, up front, in a signed agreement**, and
must only change through a governed, logged event — never a silent profile toggle.

---

## 1. The two channels (CRA / Revenu Québec)

| | **Employee** (regular · payroll) | **Independent** (travailleur autonome · contractor) |
|---|---|---|
| Withholding at source | QPP, QPIP, income tax | none — paid gross |
| Employer contributions | QPP (match), QPIP (×1.4), etc. | none |
| Year-end slip | **T4** | **T4A** (Box 048, fees ≥ $500) |
| Sales tax | n/a | worker may charge **GST/QST** if registered |
| Worker's own filing | covered by withholding | remits own QPP + income tax; EI/QPIP only if opted in |
| Who decides status | **substance, not label** — CRA/RQ weigh control, tools, financial risk, chance of profit; CNESST has its own Québec test |

Rates are effective-dated and **must come from a CPA-validated table**, not hard-coded guesses. The
current engine uses clearly-labelled *synthetic* bps in `SYNTHETIC_CONFIGS` (`packages/auth/src/payroll.ts`)
and must not be mistaken for real rates.

## 2. Current state (what already exists — do not rebuild)

- **Client billing:** `apps/api/src/invoiceRoutes.ts` — real invoices under the single platform issuer
  (9375-7649 Québec Inc.) with **GST/QST**, PDF, credit notes, delivery, audit. Tables: `invoices`,
  `invoice_configuration_versions`, `invoice_number_sequences`, `invoice_credit_notes`,
  `invoice_audit_entries`.
- **Client payments:** `employer_payment_methods` / `_attempts` / `_allocations` / `_refunds` /
  `_events`, `payment_policy_versions`, reconciliation `paymentSweeper.ts`. Frozen (test-only).
- **Worker payroll:** `packages/auth/src/payroll.ts` — calculation that **already branches** on
  `workerClassification` (contractor ⇒ no deductions, no employer cost). Synthetic, approved-only.
- **Worker payout ledger:** `worker_payouts` + `GET /worker/payouts` — pending → held → released →
  paid, 2-week hold, disputes pause a payout.

## 3. Gaps this program closes

1. **Classification is a free toggle.** `PUT /worker/profile/classification` flips
   `worker_identities.classification` with no agreement, no history, no gate. → Replace with a signed,
   immutable, versioned **election**.
2. **The channel isn't bound at onboarding.** The split lives inside the payroll calc, not as a
   decision the worker makes and signs when they join. → Bind the channel to the signed election;
   block offer acceptance until a worker has an active election.
3. **No remittance / slip layer.** Withheld amounts aren't tracked as a **liability owed to CRA/RQ**,
   and there is no **T4 / T4A**. → Add a remittance ledger + slip generation (gated).
4. **No single accountant's view.** Data spans ~15 tables. → One strict, simple ledger + dashboard:
   per shift and in aggregate, *client charged → taxes → worker paid → platform revenue → owed to
   CRA/RQ*.

## 4. Target architecture

### 4.1 Signed classification election (Phase 1 — the keystone)
- New table `worker_classification_elections`: `id, worker_identity_id, classification
  (employee|contractor), status (active|superseded|revoked), agreement_document_id, agreement_version,
  determination_ref (link to the CRA-factor questionnaire response), effective_from, effective_to,
  elected_by_user_id, approved_by_user_id, created_at`. **Append-only** — a change writes a new row and
  supersedes the prior; nothing is updated in place.
- Onboarding flow: worker picks a channel → is shown and **signs** the matching agreement (employee
  work agreement vs independent-contractor agreement) → the signature + document reference are stored
  with the election. Until an `active` election exists, the worker **cannot accept an offer**.
- Reclassification is a **governed event** (admin + reason + new signed agreement), not a worker
  toggle. The free `PUT /worker/profile/classification` is removed; the payroll
  `classificationResolver` reads the **active election**, not the mutable field.
- Determination support: capture answers to the CRA/RQ factor test (control, tools, risk, profit,
  integration) at election time so the basis is on record — advisory, reviewed by a human, never an
  automated legal ruling.

### 4.2 Two payment channels (Phase 2)
Keyed off the active election, from day one:
- **Payroll channel (employee / T4):** gross → source deductions (QPP, QPIP, income tax) → net to
  worker; employer contributions accrued; feeds the payout ledger as *net*.
- **Contractor channel (independent / T4A):** gross fee → worker (paid gross); optional GST/QST if the
  worker is registered; feeds the payout ledger as *gross*; worker-facing statement, not a pay stub.

### 4.3 Remittance & slips (Phase 3 — gated)
- `tax_remittances` ledger: each payroll run accrues liabilities owed to CRA (federal) and Revenu
  Québec (QPP, QPIP, provincial tax) + GST/QST collected on invoices, with a remittance schedule and
  status (accrued → filed → paid). Nothing files or pays while the gate is closed.
- Year-end **T4** (employees) and **T4A** (contractors, Box 048 ≥ $500) generation from the ledger.

### 4.4 Accounting ledger + dashboard (Phase 4)
- Double-entry `ledger_entries` (account, debit, credit, currency, source ref, posted_at) posting every
  event: client invoice + GST/QST, platform revenue (margin), worker earnings, deductions withheld
  (liability), employer contributions (expense + liability), payout released/paid.
- **Accountant's dashboard:** per shift and aggregate — money in (client), money out (worker),
  platform revenue, taxes to remit, GST/QST collected — every figure traceable to its source rows.
  Strict (double-entry must balance) and simple (one screen to see the whole flow).

### 4.5 The go-live gate (applies to Phases 2–4)
- A single `FINANCE_LIVE` gate, default **off**. With it off, the system **computes and accounts for**
  everything (deductions, remittances, slips, double-entry) but **executes no real money and files
  nothing** — matching today's frozen-payments stance. Opening it requires the CPA sign-off plus the
  platform's existing final release gate.

## 5. Phases & acceptance

| Phase | Deliverable | Done when |
|---|---|---|
| **P1** | Signed, immutable classification election; toggle removed; resolver reads election; offer-accept gated | A worker must sign an election to be payable; reclassification is logged + re-signed; payroll reads the active election; tests green |
| **P2** | Two channels bound to the election (payroll net vs contractor gross), GST/QST on contractor path | Each channel produces the correct net/gross + slip-type, driven only by the active election |
| **P3** | Remittance ledger + T4/T4A generation, all gated | Liabilities to CRA/RQ accrue per run; slips generate from the ledger; nothing files while gated |
| **P4** | Double-entry ledger + accountant dashboard | Every transaction posts balanced entries; the dashboard reconciles to the source tables |
| **P5** | CPA review + rate tables + go-live gate wiring | Real effective-dated rates replace synthetic; CPA signs the model; gate stays off until authorized |

## 6. Open questions for the CPA / owner
- Platform's role per channel: employer-of-record for employees? agent/marketplace for contractors?
- Real 2026 QPP / QPIP / income-tax / employer-contribution rates and caps (effective-dated).
- GST/QST: does the platform collect on the worker's behalf, or only the worker if registered?
- Remittance cadence (monthly/quarterly) and the filing entity.
- CNESST coverage and workers' comp per channel.
