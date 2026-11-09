// What the worker job search may send to the API. The browser can only NARROW the search: a place
// (city or postal code), a radius, a role, a sort, a date window, a minimum number of open places,
// "verified employers only" and a page cursor. Nothing else is forwarded, and the API stays the
// authority for which jobs are open and how far they are.

export type SearchQuery = {
  place: string;
  radiusKm?: number;
  role?: string;
  sort?: "nearest" | "soonest" | "highest_rate";
  dateFrom?: string;
  dateTo?: string;
  minOpenings?: number;
  verifiedOnly?: true;
  cursor?: number;
};

const SORTS = new Set(["nearest", "soonest", "highest_rate"]);

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const v = value.replace(/\s+/g, " ").trim().slice(0, max);
  return v.length > 0 ? v : undefined;
};
const positive = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const isoDate = (value: unknown): string | undefined => {
  const v = text(value, 40);
  return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : undefined;
};

/** The forwarded query, or null when no place was typed (the API needs one). */
export function whitelistSearchQuery(input: unknown): SearchQuery | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  // `place` is the "Where?" box; `postalCode` is still accepted from older pages.
  const place = text(record.place, 80) ?? text(record.postalCode, 80);
  if (!place) return null;
  const radiusKm = positive(record.radiusKm);
  const role = text(record.role, 80);
  const sort = typeof record.sort === "string" && SORTS.has(record.sort) ? (record.sort as SearchQuery["sort"]) : undefined;
  const dateFrom = isoDate(record.dateFrom);
  const dateTo = isoDate(record.dateTo);
  const minOpenings = positive(record.minOpenings);
  const cursor = positive(record.cursor);
  return {
    place,
    ...(radiusKm !== undefined ? { radiusKm: Math.min(radiusKm, 500) } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(sort !== undefined ? { sort } : {}),
    ...(dateFrom !== undefined ? { dateFrom } : {}),
    ...(dateTo !== undefined ? { dateTo } : {}),
    ...(minOpenings !== undefined ? { minOpenings: Math.floor(minOpenings) } : {}),
    ...(record.verifiedOnly === true ? { verifiedOnly: true as const } : {}),
    ...(cursor !== undefined ? { cursor: Math.floor(cursor) } : {})
  };
}

/** Error codes the API answers for a place it cannot use; passed through so the page can explain. */
export const PLACE_ERROR_CODES = new Set(["RWOS_PLACE_NOT_FOUND", "RWOS_PLACE_REQUIRED", "RWOS_PLACE_UNAVAILABLE"]);
