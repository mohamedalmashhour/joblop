import type { AdzunaRawJob } from "@rwos/shared";

// JobScanner source clients. The Adzuna client calls the real partner API when credentials are
// present; until the account is approved (or in tests), a MOCK client returns Adzuna-shaped Québec
// jobs so the whole pipeline — normalize → dedupe → rank → hand-off — runs end to end without keys.
// No money moves; this only fetches external job postings we display as leads.

export type AdzunaSearch = Readonly<{
  what?: string; // keywords, e.g. "personal support worker"
  where?: string; // location, e.g. "Laval"
  resultsPerPage?: number;
  maxDaysOld?: number;
  page?: number;
}>;

export interface JobSourceClient {
  readonly source: "adzuna";
  readonly mode: "live" | "mock";
  search(params: AdzunaSearch): Promise<AdzunaRawJob[]>;
}

export type AdzunaClientConfig = Readonly<{
  appId?: string | null;
  appKey?: string | null;
  country?: string; // ISO code, default "ca"
  fetchImpl?: typeof fetch;
}>;

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

// Build the Adzuna live client. Falls back to the mock client when app_id/app_key are absent, so the
// caller never has to branch — it always gets a working JobSourceClient.
export function createAdzunaClient(config: AdzunaClientConfig = {}): JobSourceClient {
  const appId = config.appId?.trim();
  const appKey = config.appKey?.trim();
  if (!appId || !appKey) return createMockAdzunaClient();
  const country = (config.country ?? "ca").toLowerCase();
  const doFetch = config.fetchImpl ?? fetch;
  return {
    source: "adzuna",
    mode: "live",
    async search(params) {
      const page = params.page ?? 1;
      const url = new URL(`${ADZUNA_BASE}/${country}/search/${page}`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", String(params.resultsPerPage ?? 20));
      url.searchParams.set("content-type", "application/json");
      if (params.what) url.searchParams.set("what", params.what);
      if (params.where) url.searchParams.set("where", params.where);
      if (params.maxDaysOld) url.searchParams.set("max_days_old", String(params.maxDaysOld));
      const res = await doFetch(url.toString(), { headers: { accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`RWOS_JOBSCANNER_ADZUNA_HTTP_${res.status}`);
      }
      const body = (await res.json()) as { results?: AdzunaRawJob[] };
      return Array.isArray(body.results) ? body.results : [];
    }
  };
}

// ── mock feed (Adzuna-shaped Québec jobs) ─────────────────────────────────────────────────────────
// A small, realistic Québec dataset used until the Adzuna account is approved. Filtered by the search
// params the same way the real API would, so the pipeline behaves identically.
const MOCK_QC_JOBS: readonly AdzunaRawJob[] = [
  {
    id: "mk-1001", title: "Personal Support Worker (PSW)", company: { display_name: "Groupe Santé Laval" },
    location: { display_name: "Laval, Québec", area: ["Canada", "Québec", "Laval"] }, latitude: 45.57, longitude: -73.72,
    salary_min: 42000, salary_max: 52000, created: "2026-10-22T09:00:00Z", contract_time: "full_time",
    category: { label: "Healthcare & Nursing Jobs" }, redirect_url: "https://www.adzuna.ca/land/ad/mk-1001", description: "Day shifts, residence in Laval."
  },
  {
    id: "mk-1002", title: "Préposé(e) aux bénéficiaires", company: { display_name: "CHSLD Montréal-Nord" },
    location: { display_name: "Montréal, Québec", area: ["Canada", "Québec", "Montréal"] }, latitude: 45.60, longitude: -73.63,
    salary_min: 40000, salary_max: 49000, created: "2026-10-23T10:30:00Z", contract_time: "part_time",
    category: { label: "Healthcare & Nursing Jobs" }, redirect_url: "https://www.adzuna.ca/land/ad/mk-1002", description: "Soins aux résidents."
  },
  {
    id: "mk-1003", title: "Housekeeping Attendant", company: { display_name: "Hôtel Vieux-Port" },
    location: { display_name: "Montréal, Québec", area: ["Canada", "Québec", "Montréal"] }, latitude: 45.50, longitude: -73.55,
    salary_min: 35000, salary_max: 41000, created: "2026-10-21T08:00:00Z", contract_time: "full_time",
    category: { label: "Hospitality & Catering Jobs" }, redirect_url: "https://www.adzuna.ca/land/ad/mk-1003", description: "Room cleaning, downtown."
  },
  {
    id: "mk-1004", title: "Warehouse Associate", company: { display_name: "Logistique QC" },
    location: { display_name: "Longueuil, Québec", area: ["Canada", "Québec", "Longueuil"] }, latitude: 45.53, longitude: -73.51,
    salary_min: 38000, salary_max: 45000, created: "2026-10-20T14:00:00Z", contract_time: "full_time",
    category: { label: "Logistics & Warehouse Jobs" }, redirect_url: "https://www.adzuna.ca/land/ad/mk-1004", description: "Picking and packing."
  },
  {
    id: "mk-1005", title: "Registered Nurse", company: { display_name: "Clinique Rive-Sud" },
    location: { display_name: "Québec City, Québec", area: ["Canada", "Québec", "Québec City"] }, latitude: 46.81, longitude: -71.21,
    salary_min: 70000, salary_max: 92000, created: "2026-10-19T11:00:00Z", contract_time: "full_time",
    category: { label: "Healthcare & Nursing Jobs" }, redirect_url: "https://www.adzuna.ca/land/ad/mk-1005", description: "Clinic nursing."
  },
  {
    id: "mk-1006", title: "Personal Support Worker", company: { display_name: "Soins à Domicile Plus" },
    location: { display_name: "Laval, Québec", area: ["Canada", "Québec", "Laval"] }, latitude: 45.58, longitude: -73.75,
    salary_min: 41000, salary_max: 50000, created: "2026-10-23T07:45:00Z", contract_time: "part_time",
    category: { label: "Healthcare & Nursing Jobs" }, redirect_url: "https://www.adzuna.ca/land/ad/mk-1006", description: "Home care visits across Laval."
  }
];

export function createMockAdzunaClient(dataset: readonly AdzunaRawJob[] = MOCK_QC_JOBS): JobSourceClient {
  return {
    source: "adzuna",
    mode: "mock",
    async search(params) {
      const what = params.what?.toLowerCase().trim();
      const where = params.where?.toLowerCase().trim();
      let rows = dataset.slice();
      if (what) {
        const terms = what.split(/\s+/);
        rows = rows.filter((j) => {
          const hay = `${j.title ?? ""} ${j.category?.label ?? ""} ${j.description ?? ""}`.toLowerCase();
          return terms.some((t) => hay.includes(t));
        });
      }
      if (where) {
        rows = rows.filter((j) => (j.location?.display_name ?? "").toLowerCase().includes(where));
      }
      return rows.slice(0, params.resultsPerPage ?? 20);
    }
  };
}
