import type { CountryAddressPort } from "@rwos/config";
import {
  PROVINCE_TERRITORY_NAMES,
  isCanadianPostalCodeFormat,
  isProvinceCode,
  isWithinCanadaBounds,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode
} from "@rwos/shared";

/**
 * Canada address adapter — implements the neutral CountryAddressPort by DELEGATING to the existing
 * @rwos/shared Canadian-location functions. It introduces no new behavior; it is a faithful wrapper
 * so master call sites can depend on the neutral port while producing byte-identical results (proven
 * by canada.test.ts). The underlying functions are NOT moved in Stage 2b.1.
 */
export const canadaAddressAdapter: CountryAddressPort = {
  normalizePostalCode: (input) => normalizeCanadianPostalCode(input),
  isPostalCodeFormat: (input) => isCanadianPostalCodeFormat(input),
  regionNameFromCode: (code) => (isProvinceCode(code) ? PROVINCE_TERRITORY_NAMES[code] : null),
  regionHintFromPostalCode: (postalCode) => provinceHintFromPostalCode(postalCode),
  isWithinCountryBounds: (latitude, longitude) => isWithinCanadaBounds(latitude, longitude)
};
