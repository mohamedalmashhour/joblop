# JobLop — International Platform & End‑to‑End "Money‑Close" Roadmap

*Prepared from a live walkthrough of the Resident Workforce OS codebase and its existing `docs/launch/` planning set. This is a planning document — no code was changed to produce it. It makes **no legal or compliance claim**; items marked "counsel" require qualified legal review.*

---

## 1. Executive summary

JobLop is already built on the right foundation to go international. The platform uses a **country‑neutral core** plus **isolated per‑country modules** (`countries/<country>/`), with a **fail‑closed country selector**: the system refuses to run a market unless that market's profile is complete and its providers are bound. The architecture work (country wiring, Canada/Syria scaffolds) is essentially done.

What is **not** done — and what your question "does everyone get their money and the transaction closes?" points at — is **activating a real market**. Today no country is activatable: payment, SMS, and maps/geocoding providers are unbound, legal terms are draft, and live money movement is deliberately disabled. Until a country is activated end‑to‑end, the loop that ends in "worker paid, employer invoiced, transaction settled and closed" **cannot run** — by design, not by bug.

This roadmap describes the complete path to that close, per country, and how to add countries cleanly.

**The three things that unlock the money‑close, for each country:**
1. **Finalized country profile** (currency, timezone, phone, data region, finalized legal + privacy terms).
2. **Three bound providers** — payment processor, SMS, and maps/geocoding (Google Maps) — with real credentials and written per‑country serviceability confirmation.
3. **A verified end‑to‑end run** of the full lifecycle in test mode, then a controlled live pilot.

---

## 2. The end‑to‑end lifecycle — where the money actually closes

A completed hire moves through this chain. The code for most of it already exists in the repo (module names in `code font`); the gaps are provider bindings and an end‑to‑end certified run.

| # | Stage | What happens | Status in codebase |
|---|-------|--------------|--------------------|
| 1 | **Post** | Employer creates a staffing request (priced from their contract) | ✅ Works (verified live) |
| 2 | **Dispatch** | Admin reviews, shortlists, approves for dispatch | ✅ Code present (`dispatch*`) — not run end‑to‑end locally |
| 3 | **Offer** | A worker offer is prepared and sent (terms shown before accept) | ✅ Code present (`workerOffer*`, delivery provider) |
| 4 | **Accept** | Worker accepts; an **assignment** is created | ✅ Code present (`assignment*`) |
| 5 | **Attendance** | Worker clocks in / out; hours recorded | ✅ Code present (`attendance*`) |
| 6 | **Timesheet** | Hours become a reviewed, approved timesheet | ✅ Code present (`timesheet*`) |
| 7 | **Payroll** | Governed payroll calculation (gross, deductions, net, employer cost) | ✅ Code present (`payroll*`, rate resolver, provenance) |
| 8 | **Invoice** | Employer is invoiced for verified hours | ✅ Code present (`invoice*`, PDF) |
| 9 | **Payment** | Employer pays; funds captured via the **payment provider** | ⚠️ Code present (`payment*`, sweep runner, reconcile) **but live money disabled — no provider bound** |
| 10 | **Payout & close** | Worker is paid their due; platform fee settled; **transaction closed** | ⚠️ Blocked at stage 9 until a payment provider is live |

**Bottom line:** the loop is ~90% built in code. The missing 10% that actually "closes the transaction with everyone paid" is **a bound, country‑confirmed payment provider** plus a **certified end‑to‑end run**. That is gated on country activation (Section 4), not on more feature code.

---

## 3. Why nothing moves today (the fail‑closed design)

This is a feature, not a flaw — it's what keeps you compliant and safe:

- **No country activated** → `RWOS_COUNTRY` defaults to a non‑market "neutral fixture" in local/test, and **refuses to boot** in staging/production. So real markets can't run accidentally.
- **Maps/geocoding unbound** → the worker's "find work near me" search fails closed (why the worker map didn't return results in the walkthrough).
- **Payment provider unbound** → live money movement is disabled; all amounts in the system today are explicitly **synthetic / test — no money**.
- **Legal terms are draft** → no market can present finalized terms to users.

A profile only becomes **activatable** when *every* launch‑critical field is present AND the gate is open AND all three providers are bound (enforced by `isCountryProfileActivatable`). Any missing piece keeps the whole market closed.

---

## 4. Activating a country — the five gates

To make a single country live end‑to‑end, all five must be satisfied. Each country is fully isolated (no sharing of currency, legal text, providers, credentials, data, or deployment across countries).

### Gate A — Country profile (engineering, fast)
Fill `countries/<country>/src/profile.ts`:
- `currency` (ISO 4217), `timezone` (IANA), `phoneCountryCode` (E.164)
- `dataRegion` (where this market's data lives — a sovereignty decision)
- Set `activationGate: "open"` (last, after everything else is ready)
- Wire the profile into the API country registry (`apiCountryRegistry`)
- *Canada's profile is already filled except legal terms + providers; it's the closest to ready.*

### Gate B — Address adapter (engineering, medium)
`countries/<country>/src/addressAdapter.ts` — postal‑code format, region names, country bounds, and the geocoding country restriction. *Canada already has one; each new country needs its own.*

### Gate C — Legal & privacy terms (counsel — the long pole)
- Finalized `legalTermsVersion` + `privacyTermsVersion` from **qualified local counsel** for that market (employment, tax, consumer, privacy law).
- Any market‑specific screening (e.g. targeted‑sanctions screening where relevant).
- **No compliance claim can be made until this is done per country.**

### Gate D — Provider bindings (commercial + engineering — see Section 5)
Bind and confirm **payment**, **SMS**, and **maps/geocoding** for that specific country.

### Gate E — Isolated deployment (infrastructure)
A per‑country deployment target: its own data region, secrets, and database, separate from other markets (your `docs/launch/JOBLOP_OWNER_GCP_CHECKLIST.md` covers the GCP side).

---

## 5. The three providers that move money and maps

These are the heart of your question. None can be assumed available in a given country — each must be confirmed **commercially**, per market.

### 5.1 Payment / money movement (the "everyone gets paid" provider)
- A processor that can **collect from employers** and **pay out to workers** in the target currency (two‑sided money movement / marketplace payouts).
- Canada/US: Stripe Connect is the common fit (the repo already has a `stripeTestProvider` scaffold and a provider‑agnostic reconcile/operation‑key layer, so the integration seam exists).
- Required before live: provider contract, KYC/onboarding for workers (payout accounts), tax reporting setup, and **written confirmation the provider serves that country** for marketplace payouts.
- Until bound, stage 9–10 (payment → close) stay disabled.

### 5.2 Maps / geocoding (Google Maps)
- Powers "find work near me," distance sorting, and worksite resolution.
- Bind Google Maps Platform (Geocoding API) with a billed API key and the per‑country `geocodeCountryRestriction`.
- This directly fixes the worker marketplace search that failed closed in the walkthrough.

### 5.3 SMS / notifications
- Worker offer delivery, confirmations, reminders (the repo has a `WorkerOfferDeliveryProvider` seam).
- A provider that delivers to that country's numbers (e.g. Twilio) with sender‑ID/regulatory setup per market.

> For each provider, per country: (1) commercial availability confirmed in writing, (2) credentials provisioned, (3) bound in the country profile, (4) exercised in test mode, (5) reconciled in a live pilot.

---

## 6. International rollout model (adding countries cleanly)

The architecture already enforces the right pattern — keep to it:

- **One module per country** under `countries/<country>/` — profile + adapters + (later) deployment config. No country ever reads another country's values.
- **Core stays neutral** — the master platform never hard‑codes a currency, tax rule, postal format, or provider. Everything country‑specific flows through the profile + ports.
- **Add a country = fill a profile + adapter + bind providers + counsel sign‑off + open the gate + wire the registry.** No schema changes are needed (jurisdiction/currency/timezone are already data columns, per the migration plan).
- **Each market certifies independently** before going live.

Suggested market sequence: **Canada first** (profile nearly complete, English/French, mature providers) as the reference activation, then your priority MENA/Arabic market(s) once counsel + provider confirmations land. (Arabic/RTL is already a known workstream in your docs.)

---

## 7. Phased roadmap

Phases 0–3 (architecture, country‑neutral core, Canada/Syria scaffolds) are **already done** in the codebase. The remaining phases are the activation work.

**Phase 4 — First country activation (Canada as reference)**
- A: Finalize Canada legal + privacy terms *(counsel)*
- B: Bind Canada payment + SMS + Google Maps *(commercial + engineering)*
- C: Decide Canada data region + stand up isolated deployment *(infra — GCP checklist)*
- D: Open Canada gate, wire into registry
- E: **Run the end‑to‑end money‑close in test mode** (Section 8), then a limited live pilot
- Exit: one real transaction closes — worker paid, employer invoiced & paid, platform fee settled

**Phase 5 — Second market (your priority international market)**
- Repeat Gates A–E for that country; add its address adapter + Arabic/RTL where relevant
- Market‑specific counsel + per‑provider confirmation (e.g. targeted‑sanctions screening where applicable)

**Phase 6 — Scale & operate**
- Per‑market monitoring, reconciliation, dispute handling, tax reporting
- Repeatable "new country" runbook so each additional market is a checklist, not a project

**External dependencies already flagged in your docs (resolve in parallel):**
- GitHub Actions billing (staging CI is currently blocked on it)
- GCP setup per `JOBLOP_OWNER_GCP_CHECKLIST.md`
- Apple/Google developer accounts (the earlier D‑U‑N‑S item) if mobile ships alongside

---

## 8. Proving the close — the end‑to‑end money simulation

Before any live money, run a **full‑lifecycle simulation in test mode** that ends in a closed transaction, so you can *see* "everyone got their money":

1. Employer posts a shift → admin dispatches → worker is offered and accepts
2. Worker clocks in/out → timesheet approved → payroll calculated
3. Employer invoiced → **test‑mode payment captured** (payment provider sandbox)
4. **Worker payout issued** (test) → platform fee settled → assignment/transaction marked **closed**
5. Assert every party's ledger balances and the transaction state = closed

This is exactly the run that could **not** complete in the walkthrough (no country, no provider, workflow not wired end‑to‑end). Standing up the sandbox providers + activating one country in test mode is what makes it runnable. Your repo already has local E2E harness patterns and payment sandbox scaffolding to build this on.

---

## 9. Immediate next decisions for you (the owner)

1. **Pick the first activation market** — recommend **Canada** (nearest to ready, mature providers) as the reference, even if your commercial priority is MENA.
2. **Engage local legal counsel** for that market's employment/tax/privacy/consumer terms — this is the long pole; start it first.
3. **Open provider conversations now** — payment (Stripe Connect or equivalent), Google Maps Platform, SMS — and get **written per‑country serviceability** confirmation.
4. **Confirm the isolated deployment target** (data region + GCP) for the first market.
5. **Authorize the test‑mode end‑to‑end simulation** (Section 8) so the money‑close is proven before a single real dollar moves.

Once you choose the first market and the provider/counsel tracks are moving, the engineering (Gates A, B, D‑wiring, and the Section 8 simulation) is the fast part — the architecture is already built for it.

---

*Questions this roadmap deliberately leaves to qualified humans: all legal/compliance/tax determinations per market, targeted‑sanctions screening, and each provider's commercial country policy. Verify current provider and sanctions positions before relying on any status.*
