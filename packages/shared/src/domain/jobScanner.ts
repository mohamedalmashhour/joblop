// JobScanner capsule — the "Skyscanner for jobs" brain (pure, deterministic, no I/O).
//
// It aggregates EXTERNAL job postings from legal partner feeds (Adzuna first; Talent.com etc. later),
// normalizes them into one shape, dedupes across sources, and ranks them for a given worker by fit +
// pay + distance. These are EXTERNAL LEADS, not JobLop governed jobs — JobLop pay/classification/
// dispatch never apply; we surface them, hand the worker off to the source, and use them as a funnel
// to convert workers onto JobLop's own jobs. No money moves here.
//
// Network/storage live outside (apps/api). This file is just the transform + match logic so it can be
// unit-tested without keys or a database.

export type ExternalJobSource = "adzuna" | "talent" | "jobbank" | "other";

export type ExternalJobLead = Readonly<{
  source: ExternalJobSource;
  sourceId: string; // the source's own id — (source, sourceId) is the natural key
  title: string;
  employer: string | null;
  locationLabel: string | null;
  city: string | null;
  province: string | null; // normalized 2-letter code where we can (QC, ON, …)
  latitude: number | null;
  longitude: number | null;
  salaryMinMinor: number | null; // in minor units (cents) of the salaryPeriod
  salaryMaxMinor: number | null;
  salaryPeriod: "year" | "hour" | null;
  contractTime: string | null; // full_time / part_time / …
  category: string | null;
  url: string; // where the worker applies (hand-off)
  postedAt: string | null; // ISO
  description: string | null;
}>;

// ── Adzuna normalization ─────────────────────────────────────────────────────────────────────────
// Shape of one element of Adzuna's /v1/api/jobs/{country}/search response `results` array. Only the
// fields we use are typed; everything is optional because the feed omits fields freely.
export type AdzunaRawJob = Readonly<{
  id?: string | number;
  title?: string;
  company?: { display_name?: string } | null;
  location?: { display_name?: string; area?: string[] } | null;
  latitude?: number;
  longitude?: number;
  salary_min?: number;
  salary_max?: number;
  created?: string;
  redirect_url?: string;
  description?: string;
  contract_time?: string;
  category?: { label?: string; tag?: string } | null;
}>;

// Canadian province/territory names (as Adzuna's `area` spells them, FR + EN) → 2-letter code.
const PROVINCE_CODES: Readonly<Record<string, string>> = {
  quebec: "QC", québec: "QC", "qc": "QC",
  ontario: "ON", "on": "ON",
  "british columbia": "BC", "colombie-britannique": "BC", "bc": "BC",
  alberta: "AB", "ab": "AB",
  manitoba: "MB", "mb": "MB",
  saskatchewan: "SK", "sk": "SK",
  "nova scotia": "NS", "nouvelle-écosse": "NS", "ns": "NS",
  "new brunswick": "NB", "nouveau-brunswick": "NB", "nb": "NB",
  "newfoundland and labrador": "NL", "terre-neuve-et-labrador": "NL", "nl": "NL",
  "prince edward island": "PE", "île-du-prince-édouard": "PE", "pe": "PE",
  "northwest territories": "NT", "territoires du nord-ouest": "NT", "nt": "NT",
  yukon: "YT", "yt": "YT",
  nunavut: "NU", "nu": "NU"
};

function provinceFromArea(area: string[] | undefined): string | null {
  if (!Array.isArray(area)) return null;
  for (const part of area) {
    const code = PROVINCE_CODES[part.trim().toLowerCase()];
    if (code) return code;
  }
  return null;
}

// City = the most specific area segment (Adzuna orders area broad→narrow), falling back to the
// first segment of the display label.
function cityFromLocation(loc: AdzunaRawJob["location"]): string | null {
  if (loc?.area && loc.area.length > 0) return loc.area[loc.area.length - 1]!.trim() || null;
  if (loc?.display_name) return loc.display_name.split(",")[0]!.trim() || null;
  return null;
}

const toMinor = (v: number | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null;

/** Normalize one Adzuna result into an ExternalJobLead. Returns null if it lacks an id or a URL. */
export function normalizeAdzunaJob(raw: AdzunaRawJob): ExternalJobLead | null {
  const sourceId = raw.id == null ? null : String(raw.id);
  const url = raw.redirect_url ?? null;
  const title = raw.title?.trim();
  if (!sourceId || !url || !title) return null;
  return {
    source: "adzuna",
    sourceId,
    title,
    employer: raw.company?.display_name?.trim() || null,
    locationLabel: raw.location?.display_name?.trim() || null,
    city: cityFromLocation(raw.location),
    province: provinceFromArea(raw.location?.area),
    latitude: typeof raw.latitude === "number" ? raw.latitude : null,
    longitude: typeof raw.longitude === "number" ? raw.longitude : null,
    salaryMinMinor: toMinor(raw.salary_min),
    salaryMaxMinor: toMinor(raw.salary_max),
    salaryPeriod: raw.salary_min || raw.salary_max ? "year" : null, // Adzuna salaries are annual
    contractTime: raw.contract_time?.trim() || null,
    category: raw.category?.label?.trim() || null,
    url,
    postedAt: raw.created ?? null,
    description: raw.description?.trim() || null
  };
}

export function normalizeAdzunaJobs(raws: readonly AdzunaRawJob[]): ExternalJobLead[] {
  const out: ExternalJobLead[] = [];
  for (const r of raws) {
    const lead = normalizeAdzunaJob(r);
    if (lead) out.push(lead);
  }
  return out;
}

// ── dedup ────────────────────────────────────────────────────────────────────────────────────────
const normToken = (s: string | null): string =>
  (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Cross-source fuzzy key: same title + employer + city is treated as the same job. */
export function fuzzyLeadKey(lead: ExternalJobLead): string {
  return [normToken(lead.title), normToken(lead.employer), normToken(lead.city)].join("|");
}

/**
 * Dedupe leads. First by exact (source, sourceId); then collapse cross-source duplicates by the fuzzy
 * key, keeping the first occurrence (callers pass higher-priority sources first).
 */
export function dedupeLeads(leads: readonly ExternalJobLead[]): ExternalJobLead[] {
  const byExact = new Map<string, ExternalJobLead>();
  for (const l of leads) {
    const k = `${l.source}:${l.sourceId}`;
    if (!byExact.has(k)) byExact.set(k, l);
  }
  const byFuzzy = new Map<string, ExternalJobLead>();
  for (const l of byExact.values()) {
    const fk = fuzzyLeadKey(l);
    if (!byFuzzy.has(fk)) byFuzzy.set(fk, l);
  }
  return [...byFuzzy.values()];
}

// ── ranking for a worker ─────────────────────────────────────────────────────────────────────────
const R_EARTH_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export type WorkerMatchProfile = Readonly<{
  roleKeywords: readonly string[]; // e.g. ["personal support worker", "psw", "care"]
  latitude?: number | null;
  longitude?: number | null;
  maxDistanceKm?: number | null; // leads farther than this are dropped (when both have coords)
  minSalaryMinorPerYear?: number | null; // optional floor on annual salary
}>;

export type RankedLead = ExternalJobLead & Readonly<{ score: number; distanceKm: number | null; titleMatch: number }>;

function titleMatchScore(title: string, keywords: readonly string[]): number {
  if (keywords.length === 0) return 0;
  const t = normToken(title);
  let hits = 0;
  for (const kw of keywords) {
    const k = normToken(kw);
    if (k && t.includes(k)) hits += 1;
  }
  return hits / keywords.length; // 0..1
}

/**
 * Rank leads for a worker. Drops leads beyond maxDistanceKm (when both have coordinates) or below the
 * salary floor. Score blends title fit (0..1, weight 0.6), closeness (0..1, weight 0.3) and whether
 * pay is known (0.1). Ties break by closer distance then more recent posting. Deterministic.
 */
export function rankLeadsForWorker(
  leads: readonly ExternalJobLead[],
  worker: WorkerMatchProfile
): RankedLead[] {
  const maxKm = worker.maxDistanceKm ?? null;
  const ranked: RankedLead[] = [];
  for (const lead of leads) {
    if (
      worker.minSalaryMinorPerYear != null &&
      lead.salaryMaxMinor != null &&
      lead.salaryMaxMinor < worker.minSalaryMinorPerYear
    ) {
      continue;
    }
    let distanceKm: number | null = null;
    if (
      worker.latitude != null &&
      worker.longitude != null &&
      lead.latitude != null &&
      lead.longitude != null
    ) {
      distanceKm = haversineKm(worker.latitude, worker.longitude, lead.latitude, lead.longitude);
      if (maxKm != null && distanceKm > maxKm) continue;
    }
    const titleMatch = titleMatchScore(lead.title, worker.roleKeywords);
    // Closeness 0..1: 1 at 0 km, decaying to 0 by 100 km (or maxKm). Unknown distance = neutral 0.5.
    const horizon = maxKm ?? 100;
    const closeness = distanceKm == null ? 0.5 : Math.max(0, 1 - distanceKm / horizon);
    const payKnown = lead.salaryMinMinor != null || lead.salaryMaxMinor != null ? 1 : 0;
    const score = Number((0.6 * titleMatch + 0.3 * closeness + 0.1 * payKnown).toFixed(4));
    ranked.push({ ...lead, score, distanceKm, titleMatch });
  }
  return ranked.sort(
    (a, b) =>
      b.score - a.score ||
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
      (b.postedAt ?? "").localeCompare(a.postedAt ?? "")
  );
}
