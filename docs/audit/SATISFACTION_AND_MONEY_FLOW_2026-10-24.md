# JobLop — Customer satisfaction & money-flow report (2026-10-24)

Scope: a fresh round of real testing on the live local stack across the three roles — **Admin**,
**Worker**, **Client (employer)** — plus the end-to-end **money flow**. Grounded in actual API calls
and UI drives this session, not assumptions. Honest findings with severity.

**Overall verdict:** the core three-role journey and the money model are **working and coherent**; the
new worker features (email verification, JobScanner, AI CV, Worker Pro) are **live and verified**. Two
real gaps remain on the money side (below). Nothing is live-billing: finance stays **gated/frozen**.

---

## 1. Worker experience — satisfaction: STRONG (with the messaging fix)
Tested live this session:
- **Sign up + email confirmation** ✅ — create account → "Confirm your email" → entered the emailed
  code → **"Email verified."** (resend + "verify later" available). Verified end to end in the UI.
- **Find work** ✅ — marketplace search (`/marketplace/jobs/search`), express interest, accept offers.
- **Fair, transparent offer** ✅ — the worker sees only *their* rate + full terms before accepting;
  never sees the employer price or platform margin. Attendance (check in/out), timesheet confirm, pay
  on a 2-week hold, payouts + tax slips endpoints all respond 200.
- **JobScanner** ✅ — external jobs ranked for the worker (85% match on-role), apply hand-off.
- **AI CV builder** ✅ — guided wizard, certificate uploads → Certifications on the CV, FR/EN, designs.
- **Worker Pro** ✅ — upsell → Interac e-transfer to billing@joblop.com → admin confirms → Pro unlocks
  AI CVs + priority jobs.
- **Honesty fix** ✅ — the old "No fees for workers — ever" (which contradicted Worker Pro) is reworded
  to the accurate **"No cut of your pay — ever"** + "Worker Pro is an optional paid upgrade" (EN + FR).

Friction / watch-items: email verification is additive (worker can skip); the worker browse needs a
valid location in the search body (not a bug, but the empty-search path 400s).

## 2. Client (employer) experience — satisfaction: GOOD
- **Open an account** ✅ — `/signup/employer`: sign-up form → auto sign-in → the same **email-code
  verification** capsule. Register + email verification proven end to end.
- **Post a job** ✅ — create request → submit (3 job types tested: PSW, Nurse-urgent, Cook).
- **Pricing the client sees** ✅ — hidden-markup model: the employer sees only **their** rate (e.g.
  $30/$50/$28 per hour); never the worker rate or margin. Urgent jobs show the emergency premium
  (Nurse $45→**$50/h**).
- **Timesheet + invoice** ✅ (engine) — employer confirms the timesheet; the **invoice engine applies
  GST (5%) + QST (9.975%)** under the single platform issuer (9375-7649 Québec Inc.), with a
  **sequential, gap-free numbering engine** (prefix + per-org/year `last_value`), bilingual PDF, credit
  notes, delivery receipts, audit trail. The owner's **real GST/QST numbers are configured**
  (TPS 762614485RT0001, TVQ 1225519125TQ0002, NEQ 1173544397).

Watch-item: an invoice is a **separate step** after timesheet lock — it is not auto-generated in the
journey (see Gap B).

## 3. Admin experience — satisfaction: STRONG
- **Govern the journey** ✅ — review → approve (sets margin/price, captures the immutable pricing
  snapshot) → dispatch → shortlist → offer → assign → attendance → timesheet approve/lock → payroll.
  All stages driven live for 3 jobs.
- **Finance visibility** ✅ — `/platform/finance/status`, `/remittances`, `/accounting` all 200; the
  remittance ledger accrues real amounts to **CRA** and **Revenu Québec** (worked example below).
- **Worker Pro order queue** ✅ — `/pro-orders` lists claimed e-transfers; one-click Confirm grants Pro
  (verified live in the admin UI).
- **AI matching dashboard** ✅ — responds 200.

## 4. The money flow — how it actually works today
Worked example from the live 3-job test (hidden-markup model; 6-hour billing floor applied):

| Job | Employer pays (labour) | Worker gross | Platform margin |
|---|---|---|---|
| PSW (normal) | $180.00 ($30/h × 6h) | $144.00 | $36.00 |
| Nurse (urgent) | $300.00 ($50/h × 6h, incl. +$5/h emergency) | $246.00 | $54.00 |
| Cook (normal) | $168.00 ($28/h × 6h) | $134.40 | $33.60 |

**On top of labour, the client is invoiced GST+QST (14.975%)** → e.g. PSW $180 → **+$26.96 tax = $206.96**
billed. The platform holds that tax to remit.

**Worker side (employee / payroll path):** gross → source deductions (income tax + QPP/QPIP) → **net**
on a 2-week hold; employer contributions accrued. Example from the ledger: a $152.64 gross shift →
**owed to CRA $22.89** (federal tax) and **Revenu Québec $51.87** (provincial $21.36 + QPP/QPIP $9.15 +
employer contribution $21.36) — all **accrued, not filed** (gated).

**The gate:** `financeLive=false`, `cpaSignoffRecorded=false` → **blocked while gated:** remittance
filing, slip filing, **worker payout execution**. Everything is *computed and accounted for*; **no money
moves and nothing is filed**. This is by design and correct.

## 5. Findings & gaps (severity-ranked)
| # | Finding | Severity | Status |
|---|---|---|---|
| A | **Variable pricing not wired into real billing.** The emergency-kept surcharge, distance gas/time, demand uplift, and 50/50 split exist only in the `/platform/pricing/quote` calculator + admin screen — they do **not** change what the employer is actually billed or the platform's margin on a real job (which still uses hidden-markup + a margin-neutral $5/h urgency pass-through). | **HIGH** | Open (fix was started, then reprioritized) |
| B | **Invoice is a separate step** — not auto-generated at timesheet lock, so the GST/QST-on-client side isn't recorded unless the invoice step is run. | **MEDIUM** | Open |
| C | **Payroll period locking** — timesheets created after a period's payroll is locked don't aggregate into that run. | **LOW** (workflow) | Guard in process |
| D | **"No fees for workers — ever"** contradicted Worker Pro. | — | **FIXED** this session |
| E | **Live finance / payments frozen** (no filing, no payout execution, card checkout 423). | — | By design — needs CPA + owner go |

## 6. Bottom line
- **Worker, Client, Admin journeys: working and coherent.** The new worker growth features are live and
  verified. Role boundaries (who sees which price) hold.
- **Money model is sound and fully accounted** (double-entry balances; taxes accrue to CRA/RQ), but
  **frozen** for real movement — correct until the CPA/legal gate clears.
- **Top thing to fix for your intended economics: Gap A** — make the variable pricing (emergency,
  distance, demand) actually bill the client and land in the platform's margin on real jobs.
