import type { PrismaClient } from "@rwos/database";

// The job categories a worker wants. Categories are the active work groups in the catalogue, so they
// follow the selected country's data instead of a fixed list here.
export class WorkerJobCategoryError extends Error {
  constructor(public readonly code: "needs_worker" | "invalid", message: string) {
    super(message);
  }
}

const activeCategories = (prisma: PrismaClient) =>
  prisma.workGroup.findMany({
    where: { status: "active" },
    orderBy: { displayOrder: "asc" },
    select: { id: true, key: true, displayLabel: true }
  });

export async function listWorkerJobCategories(prisma: PrismaClient, userId: string) {
  const worker = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
  const chosen = worker
    ? await prisma.workerJobCategory.findMany({ where: { workerIdentityId: worker.id }, select: { workGroupId: true } })
    : [];
  const chosenIds = new Set(chosen.map((c) => c.workGroupId));
  return (await activeCategories(prisma)).map((c) => ({ key: c.key, label: c.displayLabel, selected: chosenIds.has(c.id) }));
}

export async function replaceWorkerJobCategories(prisma: PrismaClient, userId: string, keys: readonly string[]) {
  const worker = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
  if (!worker) throw new WorkerJobCategoryError("needs_worker", "Set up your worker profile first.");
  const categories = await activeCategories(prisma);
  const idByKey = new Map(categories.map((c) => [c.key, c.id]));
  const wanted = [...new Set(keys)];
  if (wanted.some((key) => !idByKey.has(key))) throw new WorkerJobCategoryError("invalid", "That job category is not available.");
  await prisma.$transaction([
    prisma.workerJobCategory.deleteMany({ where: { workerIdentityId: worker.id } }),
    prisma.workerJobCategory.createMany({
      data: wanted.map((key) => ({ workerIdentityId: worker.id, workGroupId: idByKey.get(key)! }))
    })
  ]);
}

// How many workers want each category, including those nobody has chosen.
export async function jobCategoryDemand(prisma: PrismaClient) {
  const counts = await prisma.workerJobCategory.groupBy({ by: ["workGroupId"], _count: { _all: true } });
  const countById = new Map(counts.map((c) => [c.workGroupId, c._count._all]));
  return (await activeCategories(prisma)).map((c) => ({ key: c.key, label: c.displayLabel, workers: countById.get(c.id) ?? 0 }));
}

export async function workersWantingCategory(prisma: PrismaClient, key: string, limit: number) {
  const rows = await prisma.workerJobCategory.findMany({
    where: { workGroup: { key } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { workerIdentity: { select: { id: true, displayName: true } } }
  });
  return rows.map((r) => ({ workerIdentityId: r.workerIdentity.id, displayName: r.workerIdentity.displayName }));
}
