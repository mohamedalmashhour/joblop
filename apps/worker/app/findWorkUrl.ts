import type { Route } from "next";

// The one "Find work" page: List / Map / Calendar tabs that share the same filters (what work + city).
// Old pages (/browse, /job-scanner, the public calendar) send visitors here, to the right tab.

export const FIND_WORK_PATH = "/find-work";
export const FIND_WORK_TABS = ["list", "map", "calendar"] as const;
export type FindWorkTab = (typeof FIND_WORK_TABS)[number];

export function parseFindWorkTab(value: string | null | undefined): FindWorkTab {
  return (FIND_WORK_TABS as readonly string[]).includes(value ?? "") ? (value as FindWorkTab) : "list";
}

/** Clean a typed filter: trimmed, at most 80 characters. */
export function cleanFilter(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, 80);
}

/** "/find-work?tab=…&q=…&city=…" — empty filters and the default tab are left out. */
export function findWorkHref(opts: Readonly<{ tab?: FindWorkTab; q?: string | null; city?: string | null }> = {}): Route {
  const params = new URLSearchParams();
  if (opts.tab && opts.tab !== "list") params.set("tab", opts.tab);
  const q = cleanFilter(opts.q);
  const city = cleanFilter(opts.city);
  if (q) params.set("q", q);
  if (city) params.set("city", city);
  const qs = params.toString();
  return (qs ? `${FIND_WORK_PATH}?${qs}` : FIND_WORK_PATH) as Route;
}

/** Read the first value of a Next.js searchParams entry. */
export function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
