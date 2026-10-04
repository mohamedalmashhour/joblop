import type { PrismaClient } from "@rwos/database";

export type MarketWageEntry = Readonly<{ roleDefinitionId: string; medianHourlyRateMinor: number; currency: string }>;

// Admin-maintained market-wage references for every role in the province of the given residence.
// Reference data only (advisory) — it is never used to price a request, pay a worker or bill an
// employer. Returns [] when the residence has no province or no references are set yet.
export async function listMarketWagesForResidence(
  prisma: PrismaClient,
  organizationId: string,
  residenceId: string
): Promise<MarketWageEntry[]> {
  const residence = await prisma.residence.findFirst({
    where: { organizationId, id: residenceId },
    select: { province: true }
  });
  const province = residence?.province ?? null;
  if (!province) return [];
  const rows = await prisma.marketWageReference.findMany({
    where: { province },
    select: { roleDefinitionId: true, medianHourlyRateMinor: true, currency: true }
  });
  return rows.map((r) => ({ roleDefinitionId: r.roleDefinitionId, medianHourlyRateMinor: r.medianHourlyRateMinor, currency: r.currency }));
}

export type MarketWageReferenceRow = Readonly<{
  id: string;
  roleDefinitionId: string;
  province: string;
  medianHourlyRateMinor: number;
  currency: string;
  source: string | null;
  updatedAt: string;
}>;

// Every market-wage reference, for the admin maintenance view.
export async function listAllMarketWages(prisma: PrismaClient): Promise<MarketWageReferenceRow[]> {
  const rows = await prisma.marketWageReference.findMany({ orderBy: [{ province: "asc" }, { roleDefinitionId: "asc" }] });
  return rows.map((r) => ({
    id: r.id,
    roleDefinitionId: r.roleDefinitionId,
    province: r.province,
    medianHourlyRateMinor: r.medianHourlyRateMinor,
    currency: r.currency,
    source: r.source,
    updatedAt: r.updatedAt.toISOString()
  }));
}

// Admin sets (or updates) the market reference for a role in a province. One row per (role, province).
// Reference data only — it never feeds pricing, payroll or invoices.
export async function upsertMarketWage(
  prisma: PrismaClient,
  input: { roleDefinitionId: string; province: string; medianHourlyRateMinor: number; currency: string; source: string | null; updatedByUserId: string }
): Promise<MarketWageReferenceRow> {
  const data = {
    medianHourlyRateMinor: input.medianHourlyRateMinor,
    currency: input.currency,
    source: input.source,
    updatedByUserId: input.updatedByUserId
  };
  const row = await prisma.marketWageReference.upsert({
    where: { roleDefinitionId_province: { roleDefinitionId: input.roleDefinitionId, province: input.province } },
    create: { roleDefinitionId: input.roleDefinitionId, province: input.province, ...data },
    update: data
  });
  return {
    id: row.id,
    roleDefinitionId: row.roleDefinitionId,
    province: row.province,
    medianHourlyRateMinor: row.medianHourlyRateMinor,
    currency: row.currency,
    source: row.source,
    updatedAt: row.updatedAt.toISOString()
  };
}
