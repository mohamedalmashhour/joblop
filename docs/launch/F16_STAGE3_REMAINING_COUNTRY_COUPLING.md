# F16 Stage 3 — remaining country coupling (scoping)

Stages 1–2 (PR #26) introduced the `CountryProfile` seam in `@rwos/shared` and migrated the **structured**
country data (regions, contact address, legal entity, display currency symbol) in the worker + employer
apps, fail-closed, behavior-identical for Canada.

What remains is **content**, not a mechanical refactor — it must be authored per country, because a blind
substitution would produce broken localization or wrong domain terms. This doc scopes it so each item can
be filled per country (eventually under `countries/<country>/`) with native + legal review.

## 1. Prose country references (needs per-country localized strings)
A simple `{country}` interpolation is NOT safe: FR article/grammar ("au Canada" vs "en France" / "aux
Émirats") and AR declension differ by country. Treat these as per-country localized copy.

Worker (`apps/worker/app`):
- `browse/PublicJobBoard.tsx` local `t` dicts (en/fr/ar): `trust3/trust4`, `trustSub`, `jsTitle`, `jsSub`,
  `allCanada`, and the `PREVIEW` `areaEn/areaFr/areaAr` ("Across Canada").
- `browse/JobScannerDemo.tsx`: `scanning` ("…across Canada…").
- `i18n/messages.ts`: `browse.metaTitle`, `browse.metaDescription`, `land.browsePublic`.
- `manifest.ts`: app name + description.
- `browse/page.tsx`: metadata keywords ("jobs Canada", "emplois Canada").

Approach: add country-scoped copy (per language) to the profile or a per-country message overlay; the
neutral strings reference `activeCountry()`-provided localized fragments rather than literal "Canada".

## 2. Domain labels (needs per-country equivalents — a data decision)
These are Canada/Québec institutions, not translations:
- Tax slip **T4** (worker `/pay`) → per-country year-end tax document.
- **MAPAQ** food-safety cert, **RCR**, **cariste** (cv-builder skills) → per-country certs.
- **NOC** occupation codes (JobScanner external leads) → per-country classification.
- Education levels **DEP / DEC / CEGEP** (cv-builder) → per-country education system.
Approach: model these as profile-provided label sets / option lists; Canada keeps today's values.

## 3. Money-domain currency (money layer — financially sensitive)
`CAD` is hardwired AND validated in employer invoice/payment/contract boundaries
(`api/invoices/invoiceBoundary.ts`, `api/payments/paymentBoundary.ts`, contract rates, `formatMoney`).
This is the money layer's own staged migration — do NOT fold into the UI seam. Owner: money-phase sessions.

## 4. Architecture (policy)
Hoist the per-country profiles + content into `countries/<country>/` as `MULTI_COUNTRY_PLATFORM_POLICY.md`
prescribes, keeping the neutral core free of any single country's data. A real second country also requires
its launch gates: qualified legal review, targeted-sanctions screening, written per-provider confirmation.
Keep the fail-closed loader; add a neutrality guard test once prose/labels are migrated.
