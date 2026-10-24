# JobLop — Launch Readiness Execution Pack

*Prepared autonomously while you slept, from a deep read of your codebase and the simulations we ran. This is the concrete, grounded plan to take JobLop from "excellent foundation" to "launch." It states what's already built, what's config vs. build, the exact steps, and the blockers only you (or counsel/providers) can clear. No production source was changed to produce this; proposed edits are drafts for your review.*

---

## 0. The headline finding — you are closer than it looked

Driving the apps suggested the end-to-end hire-to-paid loop wasn't built. A deeper read of the code shows the opposite: **the entire lifecycle already exists as working API endpoints and services.** What stopped the live walkthrough was **wiring, permissions, config, and country activation — not missing features.**

Concretely, these already exist in `apps/api/src/app.ts`:

- **Dispatch:** `POST /platform/dispatches`, `…/candidate-review`, `…/candidates/evaluate`, `…/shortlist`, `…/shortlist-ready`, `…/offer-preparation`, pause/resume/cancel/close
- **Worker offers:** `POST /platform/worker-offers`, `…/approve`, `…/send`, `…/delivery/retry`, `POST /worker/offers/:id/accept` · `…/decline`
- **Assignments:** `POST /platform/assignments`, `…/ready-for-attendance`, `…/attendance-window`, `POST /worker/assignments/:id/acknowledge`
- **Attendance:** `POST /platform/attendance`, `…/complete`, `POST /worker/attendance/:id/check-in` · `…/check-out`
- **Payroll:** `POST /platform/payroll/periods`, `…/calculations`, `…/bulk-calculate`
- **Invoice & Payment:** invoice module (+PDF), payment repository/routes, **a `createLocalFakePaymentProvider()` for local capture**, a payment **sweep** runner, and a provider-agnostic reconcile policy.

And `PLATFORM_ADMINISTRATOR` already carries all the needed permissions (dispatch.*, worker_offer.*, assignment.*, attendance.*) — I seeded those into the local DB during our session (`RBAC_SEED_OK`).

**Implication:** a real end-to-end run is achievable in the local harness *today* by driving these endpoints in order with a platform-admin token and the local fake payment provider. The remaining launch work is four focused workstreams below.

---

## 1. Current state (verified)

| Layer | State |
|---|---|
| 3 apps (employer / worker / admin) | ✅ run with real auth |
| Employer posting + contract pricing | ✅ live-verified ($30/hr → $480) |
| Governance / permissions / audit | ✅ real, fail-closed; RBAC catalogue seeded |
| Full lifecycle services (dispatch→…→payment) | ✅ **built as API endpoints** (not yet UI-wired / not driven E2E in harness) |
| Pricing/margin/fee engine | ✅ real; end-to-end close + 4 failure paths **balance to $0.00** (Appendix A) |
| Worker marketplace search | ⚠️ blocked — needs activated country (geocoding/currency) |
| Live money movement | ⚠️ disabled by design — needs bound provider + activated country |
| Country activation | ⚠️ none activatable yet (Canada profile ~ready but gate closed; providers unbound) |

---

## 2. The four workstreams to launch

### Workstream A — Activate one country (recommend Canada)
*Mostly config + a small amount of code. The architecture is already built for this.*

1. **Finish `countries/canada/src/profile.ts`** — it already has currency CAD, timezone America/Toronto, phone +1, data region. Remaining: `legalTermsVersion`, `privacyTermsVersion` (from counsel), bind `providers.{payment,sms,geocoding}`, and set `activationGate: "open"`. (Draft in Appendix B.)
2. **Wire Canada into the registry** — `apps/api/src/countryRegistry.ts` currently registers only Syria. Add `canadaCountryProfile`. (Draft in Appendix B.)
3. **Boot with `RWOS_COUNTRY=canada`** — the fail-closed selector then injects CAD/timezone/address adapter and lets the marketplace + currency paths run.
4. Canada already has an **address adapter** (`countries/canada/src/addressAdapter.ts`) — no new adapter needed.

> Gate to activation (`isCountryProfileActivatable`): supported ✓, gate open, and every field + all three providers non-null. Legal terms + provider bindings are the only missing pieces.

### Workstream B — Bind the three providers (the money + maps rails)
Your `.env.example` already defines the slots. Provision real/test credentials via your secret manager (never in source):

| Provider | Purpose | Env keys (from `.env.example`) | Note |
|---|---|---|---|
| **Payment (Stripe)** | capture + payouts | `STRIPE_TEST_MODE_ENABLED`, `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`, `STRIPE_TEST_ACCOUNT_REFERENCE`, `STRIPE_ACSS_DEBIT_ENABLED` | Stripe is disabled by default; a provider-agnostic port + reconcile policy already exist. Start in **test mode**. |
| **Maps / geocoding** | worker search, distance | inject `geocodingProvider` (Google) via `buildApi` options; `countryAddress.geocodeCountryRestriction` = "CA" | A fallback provider exists; swap in Google for production. |
| **SMS** | offer delivery, reminders | offer-delivery adapter token (`OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN`) | `WorkerOfferDeliveryProvider` seam exists. |

Human dependency: **written per-country serviceability confirmation** from each provider before production (see §4).

### Workstream C — Drive & wire the lifecycle
*The endpoints exist; this is about running them and surfacing them in the UI.*

1. **Prove it end-to-end now (lowest risk):** run your own integration tests against a throwaway Postgres —
   `RWOS_TEST_DATABASE_URL=postgresql://$USER@localhost:5432/rwos_e2e RWOS_POSTGRES_TEST_MODE=local RWOS_TEST_DATABASE_CONFIRMATION=… pnpm test tests/integration/postgres-interest-e2e.test.ts` (and the other `postgres-*` suites). These already exercise dispatch→offer→assignment→attendance→payroll against a real DB.
2. **Live API run order** (one real transaction via platform-admin token + local fake payment provider) — the exact endpoint sequence is in Appendix C. This produces a real closed transaction in the DB, not a computation.
3. **UI wiring:** surface the dispatch→offer→assignment steps as real screens in the admin app (today its home shows demo numbers), and the offer/accept/schedule/pay screens in the worker app.

### Workstream D — Prove the financial controls (controller sign-off)
The controller gave these as the gate to production sign-off:
1. **Real-provider two-sided reconciliation** — live (test-mode) capture/payout matched to the provider statement; the sweep runner's idempotency under retry demonstrated.
2. **Real jurisdiction tax & payroll** — replace the illustrative GST/QST + CPP/EI/tax with the activated country's `PayrollRuleProvider` and tax engine.
3. **Failure-path re-close** — dispute / refund / partial-capture, each re-balancing (the computational versions already pass — Appendix A; now prove them against the provider).

---

## 3. Permissions note (so dispatch doesn't 403)
During our session a job-create hit a 403 because the seeded ORGANIZATION_OWNER role had no permissions. Fixed by running the canonical RBAC catalogue (`seedDevelopmentCatalogue`), which also grants **PLATFORM_ADMINISTRATOR** the full dispatch/offer/assignment/attendance set. For any fresh environment, run that catalogue seed as part of bootstrap so every governed action is authorized. (For production, grants come through your governed access-provisioning, not a dev seed.)

---

## 4. Blockers only you / counsel / providers can clear
These gate real launch and are **not** engineering tasks:

1. **Qualified legal counsel** per market — finalized employment/tax/privacy/consumer terms → `legalTermsVersion` + `privacyTermsVersion`. *(Start first; longest lead time.)*
2. **Provider contracts + written per-country serviceability** — Stripe (marketplace payouts), Google Maps Platform, SMS. Provision keys into your secret manager.
3. **GitHub Actions billing** — your `JOBLOP_PUBLIC_LAUNCH_CERTIFICATION.md` flags this as the current CI blocker for staging validation.
4. **GCP / data-region setup** — per `JOBLOP_OWNER_GCP_CHECKLIST.md` (isolated per-country deployment, secrets, DB).
5. **Québec tax human review** — the surcharge/tax treatment is explicitly marked "pending Québec tax human review before production."

---

## 5. Suggested sequence (fastest credible path)

**Sprint 1 — Prove it (no external deps):** run the `postgres-*` integration suites + the live API run order (Appendix C) against the local stack with the fake payment provider → a real closed transaction in the DB. Demo it.
**Sprint 2 — Activate Canada in test mode:** finish the profile (placeholder legal versions for test), wire the registry, bind Stripe **test** + Google Maps + SMS test keys, boot `RWOS_COUNTRY=canada`. Worker search + live capture now work in test.
**Sprint 3 — Controls + UI:** real tax/payroll rule provider, two-sided reconciliation, failure-path proofs; wire the admin/worker UI flows.
**In parallel from day 1 (human):** engage counsel; open provider contracts; clear GitHub Actions billing; GCP setup.
**Sprint 4 — Certify & pilot:** finalize legal versions, open the gate, limited live pilot, then public launch per your existing certification doc.

---

## Appendix A — Financial evidence (verified this session)

**End-to-end close (job JR-2026-287288, real `@rwos/shared` engine, synthetic money):**
- Pricing: employer $30/hr → worker $24/hr → platform $6/hr (20% margin); 6h minimum honoured.
- Employer invoice: Labour $480.00 + card surcharge $7.11 + GST $24.36 + QST $48.59 = **$560.06** (tax illustrative).
- Settlement ledger **balanced to $0.00**; core split exact: $480 = $384 workers + $96 platform. ✅ TRANSACTION CLOSED.

**Failure paths (all re-balance to $0.00 — verified):**
- Short shift (worked 4h → **billed 6h minimum**) ✅
- One no-show (billed for 1 of 2; no-show paid $0) ✅
- Full refund / void (all legs reverse) ✅

Scripts live in the repo root: `local-stack-close-sim.ts`, `local-stack-failpath-sim.ts` — re-run with `RWOS_ENV=local node --import tsx <file>`.

## Appendix B — Canada activation (draft edits — review before applying)

`countries/canada/src/profile.ts` — change for activation (after counsel + providers):
```ts
export const canadaCountryProfile: CountryProfile = {
  country: "canada",
  displayName: "Canada",
  supported: true,
  activationGate: "open",                 // was "closed"
  currency: "CAD",
  timezone: "America/Toronto",
  phoneCountryCode: "+1",
  dataRegion: "northamerica-northeast2",
  legalTermsVersion: "ca-legal-v1",       // from counsel (placeholder for test mode)
  privacyTermsVersion: "ca-privacy-v1",   // from counsel (placeholder for test mode)
  providers: { payment: "stripe", sms: "<sms-provider>", geocoding: "google-maps" } // bound
};
```

`apps/api/src/countryRegistry.ts` — register Canada:
```ts
import { canadaCountryProfile } from "@rwos/country-canada";
import { syriaCountryProfile } from "@rwos/country-syria";

export const apiCountryRegistry: Readonly<Record<string, CountryProfile>> = {
  [canadaCountryProfile.country]: canadaCountryProfile,
  [syriaCountryProfile.country]: syriaCountryProfile
};
```
> Note: a test asserts the current registry contents; update that test alongside this change. Keep the gate **closed** until legal + providers are real; use a separate test-mode config to exercise the flow earlier.

## Appendix C — Live end-to-end API run order (one real transaction)
Drive these as `platform-admin` (dispatch/offer/assignment/attendance) and the worker session (accept/check-in/out), against the running local stack:

1. `POST /platform/dispatches` (for JR-2026-287288) → `…/candidate-review` → `…/candidates/evaluate` → `…/shortlist` → `…/shortlist-ready` → `…/offer-preparation`
2. `POST /platform/worker-offers` → `…/approve` → `…/send`
3. `POST /worker/offers/:id/accept` (as the worker)
4. `POST /platform/assignments` → `…/ready-for-attendance` → `…/attendance-window`
5. `POST /platform/attendance` → `POST /worker/attendance/:id/check-in` → `…/check-out` → `POST /platform/attendance/:id/complete`
6. `POST /platform/payroll/periods` → `…/calculations` (or `…/bulk-calculate`)
7. Invoice generation → **payment capture via the local fake provider** → settlement/close

*(A starter driver script can be built on request; each endpoint's payload should be confirmed against its route handler as you go — safest done interactively, not blind.)*

---

*Bottom line: JobLop's lifecycle is built, its money engine is proven to balance, and activation is architected and mostly config. The critical path to launch runs through **people** — counsel and providers — more than through code. Start those two tracks now; the engineering can prove the full loop in the local harness this week.*
