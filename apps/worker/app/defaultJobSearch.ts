// The jobs the signed-in home shows before the worker types anything (owner walkthrough item 39: an
// empty page looked like "no work"). It uses the same search API as the form.

export type SearchBody = Readonly<{
  place: string;
  radiusKm?: number;
  sort?: string;
  role?: string;
  dateFrom?: string;
  minOpenings?: number;
  verifiedOnly?: true;
}>;

// "Every open job": the search API needs a place, and with no radius it looks up to 500 km around it.
// Montréal (in the API's fixed city list, so no geocoding cost) covers the launch area this way.
export const DEFAULT_ALL_JOBS_PLACE = "Montréal";

/** The place the worker saved in their profile: postal code first, then city. Null when none. */
export function savedSearchPlace(intake: { city?: string | null; postalCode?: string | null } | null | undefined): string | null {
  const postal = intake?.postalCode?.trim();
  if (postal) return postal.slice(0, 80);
  const city = intake?.city?.trim();
  return city ? city.slice(0, 80) : null;
}
