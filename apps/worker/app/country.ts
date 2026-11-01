// Country profile seam (F16). The canonical definition now lives in @rwos/shared so the worker and
// employer apps share one country-neutral core (no copy-paste divergence). This thin re-export keeps
// the existing `../country` import sites working.
export { activeCountry, SUPPORTED_COUNTRIES } from "@rwos/shared";
export type { CountryProfile, Region } from "@rwos/shared";
