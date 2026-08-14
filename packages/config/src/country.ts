// Country-NEUTRAL country-selection core (master). Per MULTI_COUNTRY_PLATFORM_POLICY.md this module
// must contain NO country-specific launch assumptions — only the CountryProfile shape, a non-market
// neutral fixture for local/test engine work, and a fail-closed resolver. Country profiles
// themselves live in isolated `countries/<country>/` implementations and are injected via `registry`.

export type CountryActivationGate = "open" | "closed";

export interface CountryProfile {
  /** Stable lowercase key, e.g. "syria". */
  readonly country: string;
  readonly displayName: string;
  /** Whether this is an intended launch market at all. */
  readonly supported: boolean;
  /** "closed" = not activatable regardless of other fields (country gate held shut). */
  readonly activationGate: CountryActivationGate;
  /** ISO 4217, e.g. "SYP". null until decided. */
  readonly currency: string | null;
  /** IANA tz, e.g. "Asia/Damascus". */
  readonly timezone: string | null;
  /** E.164 country calling code, e.g. "+963". */
  readonly phoneCountryCode: string | null;
  /** Data-residency region identifier. null until decided. */
  readonly dataRegion: string | null;
  /** Finalized legal version ids. null = DRAFT / not finalized. */
  readonly legalTermsVersion: string | null;
  readonly privacyTermsVersion: string | null;
  /** Bound provider identifiers. null = unbound (needs per-provider confirmation). */
  readonly providers: {
    readonly payment: string | null;
    readonly sms: string | null;
    readonly geocoding: string | null;
  };
  /** True ONLY for the non-market local/test fixture. Never activatable. */
  readonly isNeutralFixture?: boolean;
}

/**
 * Neutral master port for country-specific address/region behavior. A country implementation
 * supplies an adapter; master code depends only on this interface (no country specifics). Terms are
 * generic: "postal code", "region" (province/state/governorate), "bounds". Behavior-preserving
 * repoints (Phase 2b.2+) route today's inline Canadian calls through an injected adapter.
 */
export interface CountryAddressPort {
  /** Canonicalize a postal code, or null if invalid for this country. */
  normalizePostalCode(input: string): string | null;
  /** Whether the input matches this country's postal-code format. */
  isPostalCodeFormat(input: string): boolean;
  /** Human name for a region (province/state/…) code, or null if unknown. */
  regionNameFromCode(code: string): string | null;
  /** Best-effort region code inferred from a postal code, or null. */
  regionHintFromPostalCode(postalCode: string): string | null;
  /** Whether a coordinate falls within this country's geographic bounds. */
  isWithinCountryBounds(latitude: number, longitude: number): boolean;
  /** ISO country restriction passed to the geocoding provider (e.g. "CA"). */
  readonly geocodeCountryRestriction: string;
}

export const COUNTRY_CONFIG_ERRORS = {
  MISSING: "RWOS_COUNTRY_REQUIRED",
  UNSUPPORTED: "RWOS_COUNTRY_UNSUPPORTED",
  INCOMPLETE: "RWOS_COUNTRY_PROFILE_INCOMPLETE"
} as const;

/**
 * Non-market, engine-only profile so the country-neutral core can run in local/test WITHOUT
 * selecting a real market. It is never supported and never activatable, and is rejected outright in
 * staging/production.
 */
export const NEUTRAL_FIXTURE_COUNTRY: CountryProfile = {
  country: "neutral-fixture",
  displayName: "Neutral Fixture (non-market; local/test only)",
  supported: false,
  activationGate: "closed",
  currency: null,
  timezone: null,
  phoneCountryCode: null,
  dataRegion: null,
  legalTermsVersion: null,
  privacyTermsVersion: null,
  providers: { payment: null, sms: null, geocoding: null },
  isNeutralFixture: true
};

/**
 * A profile is activatable ONLY when it is a supported market with an open gate, is not the neutral
 * fixture, and every launch-critical field (currency/timezone/phone/data-region/finalized legal/
 * bound providers) is present. Any missing piece keeps it fail-closed.
 */
export function isCountryProfileActivatable(profile: CountryProfile): boolean {
  return (
    profile.supported &&
    profile.activationGate === "open" &&
    profile.isNeutralFixture !== true &&
    profile.currency !== null &&
    profile.timezone !== null &&
    profile.phoneCountryCode !== null &&
    profile.dataRegion !== null &&
    profile.legalTermsVersion !== null &&
    profile.privacyTermsVersion !== null &&
    profile.providers.payment !== null &&
    profile.providers.sms !== null &&
    profile.providers.geocoding !== null
  );
}

export interface CountryResolutionInput {
  /** local | test | staging | production */
  readonly rwosEnv: string;
  /** value of RWOS_COUNTRY (undefined if unset) */
  readonly country: string | undefined;
  /** available country profiles, injected by the composition root (never hardcoded in master) */
  readonly registry: Readonly<Record<string, CountryProfile>>;
}

/**
 * Fail-closed country selection. Rules:
 * - No RWOS_COUNTRY: local/test → NEUTRAL_FIXTURE (engine work only); staging/production → throw MISSING.
 * - "neutral-fixture" selected: allowed only in local/test; staging/production → throw UNSUPPORTED.
 * - Selected country not in registry → throw UNSUPPORTED.
 * - Selected profile present but not activatable (incomplete/gate-closed/unsupported) → throw INCOMPLETE.
 * No country ever inherits another country's profile; the registry is explicit and injected.
 */
export function resolveCountryConfig(input: CountryResolutionInput): CountryProfile {
  const isDev = input.rwosEnv === "local" || input.rwosEnv === "test";
  const selected = input.country?.trim();

  if (!selected) {
    if (isDev) return NEUTRAL_FIXTURE_COUNTRY;
    throw new Error(COUNTRY_CONFIG_ERRORS.MISSING);
  }
  if (selected === NEUTRAL_FIXTURE_COUNTRY.country) {
    if (isDev) return NEUTRAL_FIXTURE_COUNTRY;
    throw new Error(COUNTRY_CONFIG_ERRORS.UNSUPPORTED);
  }
  const profile = input.registry[selected];
  if (!profile) throw new Error(COUNTRY_CONFIG_ERRORS.UNSUPPORTED);
  if (!isCountryProfileActivatable(profile)) throw new Error(COUNTRY_CONFIG_ERRORS.INCOMPLETE);
  return profile;
}
