import { createPrismaClient } from "@rwos/database";
import { normalizeAdzunaJobs, dedupeLeads } from "@rwos/shared";
import { createAdzunaClient } from "./jobScannerClient";
import { upsertLeads } from "./jobScannerRepository";

// One-time / occasional JobScanner populate. Runs a SMALL, bounded set of province-wide searches
// against the source (Adzuna live when ADZUNA_APP_ID/ADZUNA_APP_KEY are set, else the mock feed) and
// upserts the results into the external-lead store. The public teaser and the signed-in feed read
// from that store, so this is how the "magnet" gets real data WITHOUT turning on the scheduler. Kept
// deliberately tiny to respect the source call budget. No money moves; external leads only.
const ROLES = [
  "personal support worker",
  "registered nurse",
  "cook",
  "housekeeping",
  "caregiver",
  "kitchen helper"
];
const WHERE = process.env.JOBSCANNER_SEED_WHERE ?? "Quebec";
const MAX_DAYS_OLD = Number(process.env.JOBSCANNER_SEED_MAX_DAYS_OLD ?? "30");
const RESULTS_PER_PAGE = Number(process.env.JOBSCANNER_SEED_RESULTS_PER_PAGE ?? "20");

async function main() {
  const prisma = createPrismaClient(process.env.DATABASE_URL);
  // Idempotent guard: never re-scan a store that already has leads (so a seed-on-boot flag left set
  // does nothing on later restarts, and the source budget is spent at most once here). Override with
  // JOBSCANNER_SEED_FORCE=1 to refresh deliberately.
  const existing = await prisma.externalJobLead.count();
  if (existing > 0 && process.env.JOBSCANNER_SEED_FORCE !== "1") {
    console.log(`[jobscanner-seed] store already has ${existing} leads — skipping (set JOBSCANNER_SEED_FORCE=1 to refresh).`);
    await prisma.$disconnect();
    return;
  }
  const client = createAdzunaClient({
    appId: process.env.ADZUNA_APP_ID ?? null,
    appKey: process.env.ADZUNA_APP_KEY ?? null,
    country: process.env.ADZUNA_COUNTRY ?? "ca"
  });
  console.log(`[jobscanner-seed] source=${client.source} mode=${client.mode} where=${WHERE} roles=${ROLES.length}`);
  if (client.mode === "mock") {
    console.warn("[jobscanner-seed] WARNING: running in MOCK mode (no ADZUNA_APP_ID/ADZUNA_APP_KEY). " +
      "Leads will be synthetic sample data — do NOT expose publicly as real.");
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalScanned = 0;
  for (const what of ROLES) {
    try {
      const raws = await client.search({ what, where: WHERE, maxDaysOld: MAX_DAYS_OLD, resultsPerPage: RESULTS_PER_PAGE });
      const leads = dedupeLeads(normalizeAdzunaJobs(raws));
      const { inserted, updated } = await upsertLeads(prisma, leads);
      totalScanned += raws.length;
      totalInserted += inserted;
      totalUpdated += updated;
      console.log(`[jobscanner-seed] "${what}": scanned=${raws.length} leads=${leads.length} inserted=${inserted} updated=${updated}`);
    } catch (err) {
      console.error(`[jobscanner-seed] "${what}" failed: ${(err as Error).message}`);
    }
  }
  console.log(`[jobscanner-seed] DONE scanned=${totalScanned} inserted=${totalInserted} updated=${totalUpdated}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[jobscanner-seed] fatal", err);
  process.exit(1);
});
