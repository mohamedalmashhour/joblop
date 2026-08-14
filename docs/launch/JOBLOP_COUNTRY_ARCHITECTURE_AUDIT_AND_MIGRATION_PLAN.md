# JobLop — Country-Neutral Architecture Audit & `countries/<country>` Migration Plan

**Owner decisions driving this:** (1) current release market is **Syria only**; future countries
governed separately. (2) Keep the master platform **country-neutral**; create isolated
`countries/<country>` implementations, first `countries/syria`. **This document is a PLAN + AUDIT
— no repository restructure is performed, and the verified candidate `43bc784` is preserved
unchanged.** Nothing here claims Syria compliance.

---

## A. Audit — how country-coupled is the platform today?
Repo-wide (excl. deps/build): Canada 276, Québec 346, CAD 681, America/Toronto 135, Canadian
postal 680, QC-tax terms (GST/QST/CNESST/CPP/EI/source-deduction) 360. Real Syria-specific tokens:
**≈0 functional** (8 hits, all in design docs/neutrality tests). i18n/RTL/Arabic support: **none**
(only "localization reserved" placeholders). Sanctions/export-control handling: **none in code**
(only design-doc mentions).

**Key structural finding — the core is already jurisdiction-parameterized, not hardcoded:**
- Payroll calc engine takes `jurisdictionCountry`/`jurisdictionRegion`/`currency`/`ruleProvider` as
  **inputs** (`packages/auth/src/payroll.ts:229,239`); `CA`/`QC`/`CAD`/`synthetic-fixture` appear
  only as **test/seed defaults**. The design docs explicitly forbid hardcoding a jurisdiction's
  payroll model, and adapter seams exist (`PayrollJurisdictionAdapter`, HR-3 jurisdiction adapters).
- Landing/marketing copy is tested to be **country-neutral** (`page-001` "Syria/Canada Neutral:
  Pass"; employer about/pricing/how-it-works tests assert copy does NOT mention Canada/Syria/
  province/GST/HST/VAT).

So the platform was designed with jurisdiction seams — good. But **runtime/config/data defaults are
Canada-shaped**, and there is **no first-class country/market selector**.

## B. Classification (per owner's 3 buckets)
### B1. Country-NEUTRAL core → stays in master (no per-country logic)
- Payroll calculation engine (jurisdiction-parameterized), governance, idempotency, HR-6/6.1 advisory.
- Marketplace / offer lifecycle / assignment / attendance / timesheet state machines.
- Auth, identity, roles, tenant isolation, session, rate limiting.
- HR profile/documents domain (with jurisdiction adapters), audit, observability.
- Adapter *interfaces*: payroll rule provider, geocoding, document storage, SMS/payment ports.

### B2. Country-SPECIFIC → belongs in `countries/<country>` (currently Canada-shaped)
| Concern | Today (Canada) | `countries/syria` needs (owner/counsel/provider) |
|---|---|---|
| Currency | `CAD` (681) | `SYP` — and confirm decimal/denomination model |
| Timezone | `America/Toronto` (135) | `Asia/Damascus` |
| Address/postal | `packages/shared/src/domain/canadaLocation.ts` (Canadian postal/province) | Syrian governorate/address model — new adapter, do NOT reuse Canadian format |
| Phone | `+1` NANP (13) | `+963` Syrian numbering |
| Payroll rules/tax | GST/QST/CNESST/CPP/EI provider (360) | Syrian statutory model — **qualified counsel**; DO NOT reuse Canadian semantics |
| Legal/privacy copy | drafts (PIPEDA-neutral) | Syrian-law DRAFT — **qualified counsel**; keep DRAFT |
| SMS provider | (port) | Syria-viable provider — **provider Syria-policy verified** + targeted screening |
| Payment provider | Stripe **test-only** | Syria-viable path — **provider policy + legal review**; disabled until confirmed |
| Geocoding/maps | provider port | Syria-viable provider — **provider Syria-policy verified** |
| Data region | GCP `northamerica-northeast2` | Syrian data-sovereignty + **provider Syria-availability** (verify directly) |
| Deployment/secrets/DB/storage | single staging env | isolated per-country env, secrets, DB, storage, release evidence |
| Language | English only | Arabic + RTL (new i18n layer) |

### B3. FUTURE countries → excluded from this task (no Québec/other build here).

## C. Legal / sanctions / provider / data-region posture (qualified counsel + per-provider check)
**Sanctions status (as of the owner's 2025 guidance — verify current before relying):** the broad
U.S. Syria sanctions program was **revoked effective 2025-07-01** (Executive Order), and the EU
**lifted its economic sanctions on Syria in May 2025** — both while **retaining targeted sanctions**
against specified persons/entities and security-related measures. So Syria is **NOT** under a
comprehensive U.S./EU embargo. Sources: whitehouse.gov EO (2025-06); OFAC Syria-related sanctions
page; EU Council (2025-05-28).

Consequences for launch (none resolved by code alone):
- **Targeted-sanctions screening is still required** (screen specified persons/entities/activities)
  plus **qualified legal review** for Syrian employment/tax/privacy/consumer law.
- **Provider policy must be verified directly with each provider** (GCP, payment, SMS, maps/
  geocoding, email): a provider's *commercial* Syria policy may differ from — and be more
  restrictive than — the current *legal* sanctions position. Do not assume availability either way.
- Live payments/money movement stays **disabled** until a Syria-viable, provider-confirmed, legally
  reviewed path exists.

**Do not claim Syria compliance without qualified legal review, targeted-sanctions screening, and
written per-provider confirmation.** This document makes no compliance claim. Note: the Syria NO-GO
is driven by the **unfinished country implementation** (§B/§H), **not** by a presumed comprehensive
embargo.

## D. Fail-closed country selection (DESIGN — to implement under governed approval, not now)
Proposed additive, master-side mechanism (no per-country logic in master):
1. `RWOS_COUNTRY` env (e.g. `syria`) selects a **country profile** loaded from
   `countries/<country>/profile` (currency, timezone, address adapter, phone rules, legal version
   refs, provider bindings, data-region, activation gate).
2. **Startup refuses to boot** (fail-closed) if the country profile is missing, unsupported, or
   incomplete (any required field/secret/legal-version/provider binding absent). Mirrors the
   existing `superRefine` fail-closed pattern in `packages/config`.
3. **No cross-country inheritance**: a country profile may never fall back to another country's
   currency, legal text, provider, credentials, DB, or deployment. Each is isolated.
4. Default with no `RWOS_COUNTRY`: refuse in staging/production; local/test may use an explicit
   `neutral-fixture` profile for engine tests only (never a real market).
This is a config/guard addition to master + a data/config tree under `countries/`; it does **not**
move existing files.

## E. `countries/<country>` architecture (shared core + adapters, NOT code copies)
```
countries/
  syria/
    profile.ts            # currency=SYP, tz=Asia/Damascus, phone=+963, dataRegion, activationGate=CLOSED
    location/             # Syrian governorate/address adapter (implements master AddressPort)
    payroll/              # Syrian rule provider (implements PayrollJurisdictionAdapter) — counsel-gated
    legal/                # Syria DRAFT terms/privacy (versioned) — counsel-gated
    providers/            # sms/payment/geocoding bindings — sanctions-cleared, disabled by default
    deployment/           # isolated infra/secrets/DB/storage refs (separate from master staging)
    evidence/             # this country's own governed certification
```
Master exposes **ports/interfaces**; each country supplies **adapters + config + secrets**. No
uncontrolled full-code copy (prevents drift). Canada's current shape becomes `countries/canada`
later if ever needed — not in this task.

## F. Migration plan (phased; each phase separately approved; nothing executed here)
**Phase 0 (this doc):** audit + classification + plan. No file moves.
**Phase 1:** add master `RWOS_COUNTRY` fail-closed selector + `CountryProfile` port (additive; default
keeps local/test working via a `neutral-fixture` profile) → full regression → new candidate SHA.
**Phase 2:** extract Canada-specific bits behind ports (postal/address, currency/timezone defaults,
payroll provider) without behavior change; wire the existing CA values as `countries/canada` config
used by tests. Regression must stay 1589/green.
**Phase 3:** scaffold `countries/syria` profile with activation gate **CLOSED**, DRAFT legal, disabled
providers, placeholder adapters — no real credentials, no deployment.
**Phase 4 (owner/counsel-gated):** Syria legal drafts, sanctions/provider clearance, Syrian payroll/
tax model, data-region decision, Arabic/RTL. Each is a separate governed gate.

### Affected-surface analysis (why Phase 1–2 need care, not a big-bang move)
- **Imports:** `packages/shared/src/domain/canadaLocation.ts` is imported by `apps/api/src/app.ts`
  (+ staging bootstrap). Moving/abstracting it touches API import paths and their tests.
- **Tests:** ~hundreds assert `CA`/`QC`/`CAD`/`America/Toronto` defaults (payroll seeds, e2e seeds,
  performance seed). A country selector must default these via a profile so tests stay green —
  hence Phase 1 keeps a `neutral-fixture`/`canada` profile rather than deleting the values.
- **Migrations:** **no schema change needed** — jurisdiction/currency/timezone are already row
  columns (parameterized), so country lives in data/config, not DDL. (Confirmed: `payroll.ts:229`.)
- **Deployment workflows:** `publish-staging-images` / runtime Terraform are country-neutral image
  builds; per-country isolation is at deploy/secret/DB layer, added under `countries/<country>/
  deployment`, not by forking the image build.
- **Rollback:** all phases are additive + behind a fail-closed default; revert = drop the selector.
  `43bc784` stays the certified fallback until the country architecture earns its own certification.
- **Compatibility risks:** biggest is the test suite's CA defaults — mitigated by profile-driven
  defaults; second is any code path that reads currency/timezone/postal without going through a
  port — Phase 2 must route all of them through the port before Syria can be added.

## G. Handling the just-produced launch-packaging docs
`JOBLOP_LOCAL_LAUNCH_PACKAGING.md` (candidate `43bc784`) remains a valid **technical** packaging
record, but its market verdict is **superseded**: it certified Canada-modeled technical readiness,
not Syria-market readiness. See verdict below.

## H. GO / NO-GO
- **Technical (Canada-modeled) candidate `43bc784`:** CI-green, locally certified, fail-closed money/
  storage — unchanged and preserved.
- **Syria market launch:** **NO-GO — because the Syria country implementation is unfinished**, not
  because of a presumed embargo. Missing: Syria country profile, Arabic/RTL, Syrian address/currency/
  phone, Syrian legal/tax adapters + DRAFT legal, provider bindings, and isolated deployment. Still
  required: **targeted-sanctions screening, qualified legal review, and direct per-provider Syria-
  policy verification** (broad U.S./EU sanctions were lifted in 2025; targeted measures remain —
  §C). Live payments disabled, legal DRAFT, deployment blocked, public access closed — all held.
- **Country-folder architecture:** **PLAN READY, not executed.** Awaiting owner approval of Phase 1
  before any file changes. `43bc784` preserved as the verified candidate until the country
  architecture passes its own governed certification.

### Smallest next decisions for the owner
1. Approve **Phase 1** (additive fail-closed `RWOS_COUNTRY` selector + `CountryProfile` port) to begin, or hold.
2. Engage **qualified legal counsel** on Syria sanctions/employment/tax/privacy, and obtain **written per-provider** (cloud/payment/SMS/maps) confirmation of Syria serviceability — the gating dependency for any Syria activation.
3. Confirm the isolated Syria deployment target (data region + provider set) — separate from the current GCP staging.
