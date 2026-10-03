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
