import type { PrismaClient } from "@rwos/database";

// Phase 1 of the two-channel pay design (docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md).
// A worker's employee-vs-independent status is a signed, append-only election, not a mutable flag.
// Electing (or re-classifying) supersedes the prior active row and inserts a new active one inside a
// transaction; payroll reads the single active row. The legacy worker_identities.classification
// column is kept in sync for any legacy reader, but the election is the source of truth.

export type WorkerClassification = "employee" | "contractor";

// The current signed-agreement versions a worker accepts when electing a channel. Bumping a version
// here means a new election (and a new signature) is required to adopt it.
export const WORKER_AGREEMENT_VERSIONS: Readonly<Record<WorkerClassification, string>> = {
  employee: "worker-employee-agreement-2026.10",
  contractor: "worker-contractor-agreement-2026.10"
};

export type WorkerElectionView = Readonly<{
  id: string;
  classification: WorkerClassification;
  status: string;
  agreementVersion: string | null;
  determinationRef: string | null;
  effectiveFrom: string;
  electedByUserId: string;
  approvedByUserId: string | null;
  createdAt: string;
}>;

function toView(row: {
  id: string;
  classification: string;
  status: string;
  agreementVersion: string | null;
  determinationRef: string | null;
  effectiveFrom: Date;
  electedByUserId: string;
  approvedByUserId: string | null;
  createdAt: Date;
}): WorkerElectionView {
  return {
    id: row.id,
    classification: row.classification as WorkerClassification,
    status: row.status,
    agreementVersion: row.agreementVersion,
    determinationRef: row.determinationRef,
    effectiveFrom: row.effectiveFrom.toISOString(),
    electedByUserId: row.electedByUserId,
    approvedByUserId: row.approvedByUserId,
    createdAt: row.createdAt.toISOString()
  };
}

export async function getActiveElection(
  prisma: PrismaClient,
  workerIdentityId: string
): Promise<WorkerElectionView | null> {
  const row = await prisma.workerClassificationElection.findFirst({
    where: { workerIdentityId, status: "active" }
  });
  return row ? toView(row) : null;
}

export type ElectInput = Readonly<{
  workerIdentityId: string;
  classification: WorkerClassification;
  electedByUserId: string;
  approvedByUserId?: string | null;
  agreementVersion: string;
  agreementDocumentId?: string | null;
  determinationRef?: string | null;
  reason?: string | null;
}>;

export type ElectResult =
  | { ok: true; election: WorkerElectionView }
  | { ok: false; reason: "invalid_classification" | "stale_agreement_version" | "unchanged" };

// Record a signed election: supersede the current active row (if any) and insert a new active one.
// Idempotent-ish: re-electing the SAME classification that is already active is rejected as
// "unchanged" so the history is not padded with no-op rows.
export async function electClassification(
  prisma: PrismaClient,
  input: ElectInput
): Promise<ElectResult> {
  if (input.classification !== "employee" && input.classification !== "contractor") {
    return { ok: false, reason: "invalid_classification" };
  }
  // The accepted agreement version must be the one currently in force for that channel.
  if (input.agreementVersion !== WORKER_AGREEMENT_VERSIONS[input.classification]) {
    return { ok: false, reason: "stale_agreement_version" };
  }
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.workerClassificationElection.findFirst({
      where: { workerIdentityId: input.workerIdentityId, status: "active" }
    });
    if (current && current.classification === input.classification) {
      return { unchanged: true as const };
    }
    if (current) {
      await tx.workerClassificationElection.update({
        where: { id: current.id },
        data: { status: "superseded", effectiveTo: now }
      });
    }
    const created = await tx.workerClassificationElection.create({
      data: {
        workerIdentityId: input.workerIdentityId,
        classification: input.classification,
        status: "active",
        agreementVersion: input.agreementVersion,
        agreementDocumentId: input.agreementDocumentId ?? null,
        determinationRef: input.determinationRef ?? null,
        reason: input.reason ?? null,
        effectiveFrom: now,
        electedByUserId: input.electedByUserId,
        approvedByUserId: input.approvedByUserId ?? null
      }
    });
    // Keep the legacy column in sync so any reader that still consults it is not stale.
    await tx.workerIdentity.updateMany({
      where: { id: input.workerIdentityId },
      data: { classification: input.classification, updatedAt: now }
    });
    return { unchanged: false as const, created };
  });
  if (result.unchanged) return { ok: false, reason: "unchanged" };
  return { ok: true, election: toView(result.created) };
}
