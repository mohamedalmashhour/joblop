import type { PrismaClient } from "@rwos/database";
import { dedupeLeads, normalizeAdzunaJobs } from "@rwos/shared";
import type { JobSourceClient } from "./jobScannerClient";
import { upsertLeads } from "./jobScannerRepository";

// JobScanner scheduled re-scan ("update all the time"). A set of saved queries is re-pulled on an
// interval, normalized, deduped and upserted so stored leads stay fresh. Default OFF — it only runs
// when JOBSCANNER_SCAN_INTERVAL_MIN + JOBSCANNER_SCAN_QUERIES are set.
//
// ⚠️ CALL BUDGET: each query is one source API call. Adzuna's free "test" plan is only 25 calls TOTAL,
// so a live schedule exhausts it almost immediately — turn this on against live Adzuna only on a paid
// plan (£8/mo = 500/day). Against the mock client it is free.

export type ScanQuery = Readonly<{ what?: string; where?: string; maxDaysOld?: number; resultsPerPage?: number }>;

export type ScanBatchEntry = Readonly<{ query: ScanQuery; scanned: number; inserted: number; updated: number; error?: string }>;

/** Run one pass over all queries: search → normalize → dedupe → upsert. Never throws; per-query errors are captured. */
export async function runScanBatch(
  prisma: PrismaClient,
  client: JobSourceClient,
  queries: readonly ScanQuery[]
): Promise<ScanBatchEntry[]> {
  const out: ScanBatchEntry[] = [];
  for (const query of queries) {
    try {
      const raws = await client.search({
        ...(query.what !== undefined ? { what: query.what } : {}),
        ...(query.where !== undefined ? { where: query.where } : {}),
        ...(query.maxDaysOld !== undefined ? { maxDaysOld: query.maxDaysOld } : {}),
        resultsPerPage: query.resultsPerPage ?? 20
      });
      const leads = dedupeLeads(normalizeAdzunaJobs(raws));
      const res = await upsertLeads(prisma, leads);
      out.push({ query, scanned: raws.length, inserted: res.inserted, updated: res.updated });
    } catch (err) {
      out.push({ query, scanned: 0, inserted: 0, updated: 0, error: (err as Error).message });
    }
  }
  return out;
}

export type ScheduleConfig = Readonly<{
  prisma: PrismaClient;
  client: JobSourceClient;
  queries: readonly ScanQuery[];
  intervalMinutes: number;
  logger?: {
    info: (event: string, fields?: Record<string, string | number | boolean>) => void;
    warn: (event: string, fields?: Record<string, string | number | boolean>) => void;
  };
}>;

/**
 * Start the periodic scan. Runs one pass shortly after start, then every intervalMinutes. Returns a
 * stop() that clears the timer. The timer is unref'd so it never keeps the process alive on its own.
 */
export function startJobScannerSchedule(config: ScheduleConfig): () => void {
  const intervalMs = Math.max(1, config.intervalMinutes) * 60_000;
  let running = false;
  const tick = async () => {
    if (running) return; // never overlap passes
    running = true;
    try {
      const results = await runScanBatch(config.prisma, config.client, config.queries);
      const totals = results.reduce(
        (a, r) => ({ scanned: a.scanned + r.scanned, inserted: a.inserted + r.inserted, updated: a.updated + r.updated }),
        { scanned: 0, inserted: 0, updated: 0 }
      );
      config.logger?.info("jobscanner.schedule.pass", { mode: config.client.mode, ...totals, queries: config.queries.length });
    } catch (err) {
      config.logger?.warn("jobscanner.schedule.error", { message: (err as Error).message });
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => void tick(), 5_000);
  const interval = setInterval(() => void tick(), intervalMs);
  if (typeof first.unref === "function") first.unref();
  if (typeof interval.unref === "function") interval.unref();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
