import type { PrismaClient } from "@rwos/database";
import type { ExternalJobLead, ExternalJobSource } from "@rwos/shared";

// JobScanner persistence. Leads are upserted by (source, sourceId) on each scan so a re-scan refreshes
// lastSeenAt and any changed fields without duplicating. firstSeenAt is preserved across re-scans.
// External leads only — no money, no Joblop governance.

type LeadRow = {
  source: string;
  sourceId: string;
  title: string;
  employer: string | null;
  locationLabel: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryPeriod: string | null;
  contractTime: string | null;
  category: string | null;
  url: string;
  postedAt: Date | null;
  description: string | null;
};

function toRow(l: ExternalJobLead): LeadRow {
  return {
    source: l.source,
    sourceId: l.sourceId,
    title: l.title,
    employer: l.employer,
    locationLabel: l.locationLabel,
    city: l.city,
    province: l.province,
    latitude: l.latitude,
    longitude: l.longitude,
    salaryMinMinor: l.salaryMinMinor,
    salaryMaxMinor: l.salaryMaxMinor,
    salaryPeriod: l.salaryPeriod,
    contractTime: l.contractTime,
    category: l.category,
    url: l.url,
    postedAt: l.postedAt ? new Date(l.postedAt) : null,
    description: l.description
  };
}

function toLead(row: LeadRow): ExternalJobLead {
  return {
    source: row.source as ExternalJobSource,
    sourceId: row.sourceId,
    title: row.title,
    employer: row.employer,
    locationLabel: row.locationLabel,
    city: row.city,
    province: row.province,
    latitude: row.latitude,
    longitude: row.longitude,
    salaryMinMinor: row.salaryMinMinor,
    salaryMaxMinor: row.salaryMaxMinor,
    salaryPeriod: (row.salaryPeriod as ExternalJobLead["salaryPeriod"]) ?? null,
    contractTime: row.contractTime,
    category: row.category,
    url: row.url,
    postedAt: row.postedAt ? row.postedAt.toISOString() : null,
    description: row.description
  };
}

export type UpsertResult = Readonly<{ inserted: number; updated: number }>;

/** Upsert a batch of leads by (source, sourceId); refresh lastSeenAt. Returns insert/update counts. */
export async function upsertLeads(prisma: PrismaClient, leads: readonly ExternalJobLead[]): Promise<UpsertResult> {
  let inserted = 0;
  let updated = 0;
  const now = new Date();
  for (const lead of leads) {
    const row = toRow(lead);
    const existing = await prisma.externalJobLead.findUnique({
      where: { source_sourceId: { source: row.source, sourceId: row.sourceId } },
      select: { id: true }
    });
    if (existing) {
      await prisma.externalJobLead.update({ where: { id: existing.id }, data: { ...row, lastSeenAt: now } });
      updated += 1;
    } else {
      await prisma.externalJobLead.create({ data: { ...row, firstSeenAt: now, lastSeenAt: now } });
      inserted += 1;
    }
  }
  return { inserted, updated };
}

export type QueryLeadsOptions = Readonly<{ province?: string; city?: string; query?: string; limit?: number }>;
export type StoredLead = ExternalJobLead & Readonly<{ id: string }>;

// Stopwords dropped from role queries. Common EN/FR function words — especially short ones like "de"
// that otherwise substring-match almost every French QC listing (e.g. "chef de cuisine" would match
// "Aide-soignante", "CIUSSS de l'Estrie", "Directeur de succursale" via the "de" token), returning
// unrelated jobs. Removing them makes the search return the actual trade.
const LEAD_QUERY_STOPWORDS = new Set([
  "de", "des", "du", "la", "le", "les", "l", "un", "une", "et", "en", "au", "aux", "à", "d",
  "of", "the", "and", "a", "an", "or", "for", "in", "on", "to", "with"
]);

/** Split a free-text role/keyword query into up to 8 meaningful search tokens (stopwords removed). */
export function leadQueryTokens(query: string | undefined): string[] {
  return (query ?? "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !LEAD_QUERY_STOPWORDS.has(t.toLowerCase()))
    .slice(0, 8);
}

/**
 * Query stored leads, most-recently-seen first, optionally filtered by province and/or city.
 * When `query` is given it also NARROWS to leads whose title, employer or category contains any of
 * the query tokens (case-insensitive) — so a search for "chef" returns chef leads, not everything
 * with chef merely ranked higher. Without a query the behaviour is unchanged.
 */
export async function queryStoredLeads(prisma: PrismaClient, opts: QueryLeadsOptions = {}): Promise<StoredLead[]> {
  const tokens = leadQueryTokens(opts.query);
  const rows = await prisma.externalJobLead.findMany({
    where: {
      ...(opts.province ? { province: opts.province } : {}),
      ...(opts.city ? { city: { contains: opts.city, mode: "insensitive" } } : {}),
      ...(tokens.length > 0
        ? {
            OR: tokens.flatMap((tok) => [
              { title: { contains: tok, mode: "insensitive" as const } },
              { employer: { contains: tok, mode: "insensitive" as const } },
              { category: { contains: tok, mode: "insensitive" as const } }
            ])
          }
        : {})
    },
    orderBy: { lastSeenAt: "desc" },
    take: opts.limit ?? 100
  });
  return rows.map((r) => ({ id: r.id, ...toLead(r) }));
}
