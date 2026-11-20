// Place search ("Where?") helpers shared by the API, the worker website and the phone app.
//
// Québec place names carry accents ("Montréal", "Lévis", "Trois-Rivières") that people often skip
// when they type. Every place comparison goes through foldPlaceText so "Montreal", "montréal" and
// "MONTREAL" are the same place, and "St-Jérôme" matches "Saint-Jérôme". Pure and deterministic.
//
// KNOWN_PLACES is a small, fixed list of Québec and major Canadian cities with their approximate
// centre. It lets the signed-in job search accept a city name without calling a paid geocoder, and
// it works the same in local, CI and production. It is a convenience, not a gazetteer: a name that
// is not listed falls back to the geocoding provider.

import type { ProvinceCode } from "./canadaLocation";

const PROVINCE_WORDS = new Set([
  "ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt",
  "quebec", "ontario", "alberta", "manitoba", "saskatchewan", "canada"
]);

/**
 * Lower-case, accent-free, punctuation-free form of a place name, for comparisons only.
 * "Saint-Jérôme" → "saint jerome", "St-Jérôme" → "saint jerome", "Val-d'Or" → "val d or".
 */
export function foldPlaceText(value: string | null | undefined): string {
  if (!value) return "";
  const words = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0)
    .map((w) => (w === "st" ? "saint" : w === "ste" ? "sainte" : w));
  return words.join(" ");
}

/** The folded query without a trailing province or country ("Laval, QC" → "laval"). */
function foldPlaceQuery(value: string | null | undefined): string {
  const words = foldPlaceText(value).split(" ").filter((w) => w.length > 0);
  while (words.length > 1 && PROVINCE_WORDS.has(words[words.length - 1]!)) words.pop();
  return words.join(" ");
}

/** True when a stored place name contains what the person typed, ignoring accents and case. */
export function placeMatches(candidate: string | null | undefined, query: string | null | undefined): boolean {
  const q = foldPlaceQuery(query);
  if (!q) return true;
  const c = foldPlaceText(candidate);
  return c.length > 0 && c.includes(q);
}

/** The stored names (for example distinct city values) that match what the person typed. */
export function matchingPlaceNames(candidates: readonly (string | null | undefined)[], query: string): string[] {
  const out = new Set<string>();
  for (const c of candidates) if (c && placeMatches(c, query)) out.add(c);
  return [...out];
}

/** True when the text looks like a Canadian postal code or its first half (FSA), e.g. "H2X 1Y4" / "H2X". */
export function looksLikePostalCode(value: string | null | undefined): boolean {
  const compact = (value ?? "").replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]\d[A-Z](\d[A-Z]\d)?$/.test(compact);
}

/** The first half of a postal code ("h2x1y4" → "H2X"), or null when it does not look like one. */
export function postalAreaOf(value: string | null | undefined): string | null {
  if (!looksLikePostalCode(value)) return null;
  return (value ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 3);
}

export type KnownPlace = Readonly<{
  name: string;
  province: ProvinceCode;
  latitude: number;
  longitude: number;
  aliases?: readonly string[];
}>;

// Approximate city centres. Québec first (Joblop's market), then Canada's other large cities.
export const KNOWN_PLACES: readonly KnownPlace[] = [
  { name: "Montréal", province: "QC", latitude: 45.5019, longitude: -73.5674, aliases: ["mtl", "montreal city"] },
  { name: "Laval", province: "QC", latitude: 45.6066, longitude: -73.7124 },
  { name: "Longueuil", province: "QC", latitude: 45.5312, longitude: -73.5181 },
  { name: "Québec", province: "QC", latitude: 46.8139, longitude: -71.208, aliases: ["quebec city", "ville de quebec"] },
  { name: "Lévis", province: "QC", latitude: 46.8033, longitude: -71.1779 },
  { name: "Gatineau", province: "QC", latitude: 45.4765, longitude: -75.7013 },
  { name: "Sherbrooke", province: "QC", latitude: 45.4042, longitude: -71.8929 },
  { name: "Trois-Rivières", province: "QC", latitude: 46.343, longitude: -72.543 },
  { name: "Saguenay", province: "QC", latitude: 48.4284, longitude: -71.0685, aliases: ["chicoutimi", "jonquiere"] },
  { name: "Terrebonne", province: "QC", latitude: 45.7004, longitude: -73.6473 },
  { name: "Saint-Jean-sur-Richelieu", province: "QC", latitude: 45.3071, longitude: -73.2626 },
  { name: "Repentigny", province: "QC", latitude: 45.7422, longitude: -73.4501 },
  { name: "Brossard", province: "QC", latitude: 45.45, longitude: -73.465 },
  { name: "Drummondville", province: "QC", latitude: 45.8838, longitude: -72.4843 },
  { name: "Saint-Jérôme", province: "QC", latitude: 45.7804, longitude: -74.0036 },
  { name: "Granby", province: "QC", latitude: 45.4, longitude: -72.7333 },
  { name: "Blainville", province: "QC", latitude: 45.67, longitude: -73.88 },
  { name: "Saint-Hyacinthe", province: "QC", latitude: 45.6307, longitude: -72.9567 },
  { name: "Mirabel", province: "QC", latitude: 45.65, longitude: -74.0833 },
  { name: "Shawinigan", province: "QC", latitude: 46.5667, longitude: -72.75 },
  { name: "Dollard-des-Ormeaux", province: "QC", latitude: 45.4942, longitude: -73.8236 },
  { name: "Rimouski", province: "QC", latitude: 48.4489, longitude: -68.523 },
  { name: "Châteauguay", province: "QC", latitude: 45.38, longitude: -73.75 },
  { name: "Victoriaville", province: "QC", latitude: 46.05, longitude: -71.9667 },
  { name: "Rouyn-Noranda", province: "QC", latitude: 48.2366, longitude: -79.0231 },
  { name: "Salaberry-de-Valleyfield", province: "QC", latitude: 45.25, longitude: -74.1333, aliases: ["valleyfield"] },
  { name: "Vaudreuil-Dorion", province: "QC", latitude: 45.4, longitude: -74.0333 },
  { name: "Mascouche", province: "QC", latitude: 45.75, longitude: -73.6 },
  { name: "Boucherville", province: "QC", latitude: 45.5911, longitude: -73.4364 },
  { name: "Saint-Eustache", province: "QC", latitude: 45.565, longitude: -73.905 },
  { name: "Pointe-Claire", province: "QC", latitude: 45.45, longitude: -73.8167 },
  { name: "Joliette", province: "QC", latitude: 46.0167, longitude: -73.45 },
  { name: "Sorel-Tracy", province: "QC", latitude: 46.0333, longitude: -73.1167 },
  { name: "Magog", province: "QC", latitude: 45.2667, longitude: -72.15 },
  { name: "Saint-Georges", province: "QC", latitude: 46.1167, longitude: -70.6667 },
  { name: "Thetford Mines", province: "QC", latitude: 46.1, longitude: -71.3 },
  { name: "Rivière-du-Loup", province: "QC", latitude: 47.8333, longitude: -69.5333 },
  { name: "Alma", province: "QC", latitude: 48.55, longitude: -71.65 },
  { name: "Val-d'Or", province: "QC", latitude: 48.1, longitude: -77.7833 },
  { name: "Baie-Comeau", province: "QC", latitude: 49.2167, longitude: -68.15 },
  { name: "Sept-Îles", province: "QC", latitude: 50.2001, longitude: -66.3821 },
  { name: "Toronto", province: "ON", latitude: 43.6532, longitude: -79.3832 },
  { name: "Ottawa", province: "ON", latitude: 45.4215, longitude: -75.6972 },
  { name: "Mississauga", province: "ON", latitude: 43.589, longitude: -79.6441 },
  { name: "Hamilton", province: "ON", latitude: 43.2557, longitude: -79.8711 },
  { name: "Kingston", province: "ON", latitude: 44.2312, longitude: -76.486 },
  { name: "London", province: "ON", latitude: 42.9849, longitude: -81.2453 },
  { name: "Windsor", province: "ON", latitude: 42.3149, longitude: -83.0364 },
  { name: "Vancouver", province: "BC", latitude: 49.2827, longitude: -123.1207 },
  { name: "Victoria", province: "BC", latitude: 48.4284, longitude: -123.3656 },
  { name: "Calgary", province: "AB", latitude: 51.0447, longitude: -114.0719 },
  { name: "Edmonton", province: "AB", latitude: 53.5461, longitude: -113.4938 },
  { name: "Winnipeg", province: "MB", latitude: 49.8951, longitude: -97.1384 },
  { name: "Regina", province: "SK", latitude: 50.4452, longitude: -104.6189 },
  { name: "Saskatoon", province: "SK", latitude: 52.1332, longitude: -106.67 },
  { name: "Halifax", province: "NS", latitude: 44.6488, longitude: -63.5752 },
  { name: "Moncton", province: "NB", latitude: 46.0878, longitude: -64.7782 },
  { name: "Fredericton", province: "NB", latitude: 45.9636, longitude: -66.6431 },
  { name: "Charlottetown", province: "PE", latitude: 46.2382, longitude: -63.1311 },
  { name: "St. John's", province: "NL", latitude: 47.5615, longitude: -52.7126 }
];

/**
 * Find a listed city from what the person typed, ignoring accents, case and a trailing province.
 * An exact name or alias wins; otherwise a unique name that starts with the text (3+ letters).
 * Returns null when nothing (or more than one city) matches.
 */
export function resolveKnownPlace(query: string | null | undefined, places: readonly KnownPlace[] = KNOWN_PLACES): KnownPlace | null {
  const q = foldPlaceQuery(query);
  if (q.length < 2) return null;
  const exact = places.find((p) => foldPlaceText(p.name) === q || (p.aliases ?? []).some((a) => foldPlaceText(a) === q));
  if (exact) return exact;
  if (q.length < 3) return null;
  const starts = places.filter((p) => foldPlaceText(p.name).startsWith(q));
  return starts.length === 1 ? starts[0]! : null;
}
