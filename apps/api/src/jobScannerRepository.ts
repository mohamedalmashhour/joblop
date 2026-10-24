import type { PrismaClient } from "@rwos/database";
import type { ExternalJobLead, ExternalJobSource } from "@rwos/shared";

// JobScanner persistence. Leads are upserted by (source, sourceId) on each scan so a re-scan refreshes
// lastSeenAt and any changed fields without duplicating. firstSeenAt is preserved across re-scans.
// External leads only — no money, no JobLop governance.

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

export type QueryLeadsOptions = Readonly<{ province?: string; city?: string; limit?: number }>;
export type StoredLead = ExternalJobLead & Readonly<{ id: string }>;

/** Query stored leads, most-recently-seen first, optionally filtered by province and/or city. */
export async function queryStoredLeads(prisma: PrismaClient, opts: QueryLeadsOptions = {}): Promise<StoredLead[]> {
  const rows = await prisma.externalJobLead.findMany({
    where: {
      ...(opts.province ? { province: opts.province } : {}),
      ...(opts.city ? { city: { contains: opts.city, mode: "insensitive" } } : {})
    },
    orderBy: { lastSeenAt: "desc" },
    take: opts.limit ?? 100
  });
  return rows.map((r) => ({ id: r.id, ...toLead(r) }));
}
