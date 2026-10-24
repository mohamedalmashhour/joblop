# JobLop — CPA review brief (Québec payroll / contractor model)

**Purpose:** everything a Québec CPA needs to validate JobLop's pay model before it goes live. The
system is fully built but **gated OFF** — it computes and accounts for everything today, but moves no
money and files nothing. Your sign-off (plus real rates) is what opens the gate.

**One-line context:** JobLop is a **job marketplace** (not a staffing/placement agency). Workers are
primarily **independent contractors (T4A)**, paid gross; an **employee (T4) payroll** path also exists
for relationships that are genuinely employment. The worker signs a **CNESST-based contract** at
onboarding and the classification is a signed, immutable election.

---

## 1. The two channels (what's implemented)

**Independent contractor (T4A) — primary.**
- Worker is paid **gross** (no source deductions).
- If the contractor is **GST/QST-registered**, GST (5%) + QST (9.975%) are added to their fee; the
  platform pays it and the contractor remits it. (The platform separately charges the client GST/QST
  on its own invoice under its registration — 9375-7649 Québec Inc.)
- Year-end **T4A** (Box 048 fees; + GST/QST collected).

**Employee (T4) — payroll.**
- Source deductions withheld (income tax + QPP + QPIP), employer contributions accrued; platform is
  employer of record. Year-end **T4** (and, we assume, **RL-1** — please confirm).
- A remittance ledger accrues what's owed to **CRA** (federal) and **Revenu Québec** (provincial +
  QPP/QPIP + employer contribution).

## 2. What we need you to VALIDATE
1. **Is the independent-contractor model defensible** for this marketplace, given the platform
   currently sets the governed rate and dispatches work? (CRA / Revenu Québec / CNESST substance tests.)
   — a dynamic-offer engine is being added where workers negotiate/accept terms, to strengthen this.
2. **The slip mapping:** T4 boxes (we use employment income, income tax, QPP/QPIP, employer
   contributions) and T4A Box 048. Confirm RL-1 handling for Québec employees.
3. **The GST/QST contractor flow:** is "contractor invoices the platform with GST/QST, platform claims
   ITCs" the right model, or should the platform not involve itself in the contractor's sales tax?
4. **Remittance cadence** (monthly/quarterly) and the filing entity.
5. **CNESST / workers' comp** coverage per channel, and whether the platform must register.
6. **Vacation pay:** the engine currently accrues 6% vacation on BOTH channels — we believe it should
   NOT apply to a true independent contractor. Please confirm.

## 3. The exact RATES we need from you (they replace clearly-labelled synthetic placeholders)
These live in one effective-dated table (`packages/auth/src/payroll.ts`, `JURISDICTION_RATE_TABLE`),
keyed by jurisdiction (`CA/QC`) and an `effectiveFrom` date. Please provide 2026 values (all as basis
points where noted, i.e. 1500 = 15.00%):

| Field | Meaning | Synthetic placeholder (replace) |
|---|---|---|
| `federalTaxBps` | federal income tax withholding | 1500 |
| `provincialTaxBps` | Québec income tax withholding | 1400 |
| `socialInsuranceBps` | QPP + QPIP employee portion | 600 |
| `employerContributionBps` | employer QPP/QPIP + contributions | 1400 |
| `vacationPayBps` | vacation accrual | 600 |
| `overtimeThresholdMinutes` | weekly OT threshold | 2400 (40h) |
| `overtimeMultiplierBps` | OT multiplier | 15000 (1.5×) |
| GST / QST rates | contractor sales tax | GST 5.000%, QST 9.975% (please confirm) |

(If QPP and QPIP need separate boxes/lines rather than one `socialInsurance`, tell us and we'll split
the field.)

## 4. What's already true (so you can trust the numbers)
- The accounting is **double-entry and reconciles by construction**: for every job,
  `client billed = worker net + deductions + employer cost + platform net`.
- A worked example (employee, 6h × $30 client / $24 worker governed rate): client billed $180, worker
  net $99.24, owed to CRA/RQ $74.76, platform net $6.00 — balanced.
- **Nothing is live:** `FINANCE_LIVE` is OFF and the config refuses to enable it without a recorded CPA
  sign-off reference in staging/production. No remittance is filed; no payout is executed.

## 5. How your sign-off lands in the system
1. You provide the rates (section 3) and answers (section 2).
2. We load the rates into the effective-dated table with the correct `effectiveFrom`.
3. `FINANCE_LIVE_ENABLED=enabled` + `FINANCE_LIVE_CPA_SIGNOFF=<your reference>` is set in staging, then
   production — only then does anything file or pay, and only after the owner's final go-live gate.

*Design reference for full detail: `docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md`.*
