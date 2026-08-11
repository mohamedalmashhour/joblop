// Employer Material Edit / Reconfirmation service.
//
// The API classifies a proposed live edit (via @rwos/shared classifyRequestEdit,
// server-side) and calls this service with the result. NON_MATERIAL edits are applied
// directly. MATERIAL edits are NEVER applied to accepted terms — they are recorded as
// a governed change proposal (preserving the original accepted terms) that finalizes
// only after the governed reconfirmation completes. This service does not run the
// classifier; classification is an authoritative input from the server.

const CONTRACT_MANAGER_ROLES: readonly string[] = ["ORGANIZATION_OWNER", "ORGANIZATION_ADMINISTRATOR"];

export type EmployerRequestEditErrorCode = "denied" | "not_found" | "invalid" | "conflict";
export class EmployerRequestEditError extends Error {
  readonly code: EmployerRequestEditErrorCode;
  constructor(code: EmployerRequestEditErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EmployerRequestEditError";
  }
}

export type EditMembershipReader = Readonly<{
  listMemberships(userId: string): Promise<
    readonly Readonly<{ organizationId: string; status: string; roleKeys: readonly string[] }>[]
  >;
}>;

// Non-material profile fields that may be applied directly on a live request.
export type NonMaterialProfileFields = Readonly<{
  dutiesSummary?: string | null;
  specialInstructions?: string | null;
  addressSummary?: string | null;
}>;

export type ProfileWriter = Readonly<{
  applyNonMaterialProfile(input: {
    organizationId: string;
    jobRequestId: string;
    actorUserId: string;
    fields: NonMaterialProfileFields;
  }): Promise<boolean>;
}>;

export type StoredChangeProposal = Readonly<{
  id: string;
  organizationId: string;
  jobRequestId: string;
  status: "proposed" | "reconfirmation_pending" | "completed" | "rejected" | "requires_reconciliation" | "cancelled";
  materialFields: readonly string[];
  affectedAssignmentIds: readonly string[];
  originalTermsVersion: number;
  proposedTermsVersion: number;
  governedRateMinor: number | null;
  currency: string | null;
}>;

export type ProposalStore = Readonly<{
  createProposal(input: {
    organizationId: string;
    jobRequestId: string;
    actorUserId: string;
    baseRequestVersion: number;
    status: StoredChangeProposal["status"];
    materialFields: readonly string[];
    proposedValues: Record<string, unknown>;
    affectedAssignmentIds: readonly string[];
    originalTermsVersion: number;
    proposedTermsVersion: number;
    governedRateMinor: number | null;
    currency: string | null;
    reason: string | null;
    now: Date;
  }): Promise<StoredChangeProposal>;
  findById(proposalId: string): Promise<StoredChangeProposal | null>;
  updateStatus(proposalId: string, status: StoredChangeProposal["status"], now: Date): Promise<StoredChangeProposal>;
  listByStatus(statuses: readonly StoredChangeProposal["status"][], limit: number): Promise<readonly StoredChangeProposal[]>;
}>;

async function assertManager(reader: EditMembershipReader, actorUserId: string, organizationId: string) {
  const memberships = await reader.listMemberships(actorUserId);
  const ok = memberships.some(
    (m) => m.organizationId === organizationId && m.status === "active" && m.roleKeys.some((r) => CONTRACT_MANAGER_ROLES.includes(r))
  );
  if (!ok) throw new EmployerRequestEditError("denied", "An active organization owner or administrator is required to edit a request.");
}

export function createEmployerRequestEditService(deps: {
  membershipReader: EditMembershipReader;
  profileWriter: ProfileWriter;
  proposalStore: ProposalStore;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  return {
    // Apply a NON-MATERIAL edit directly (arrival instructions, notes, duties). The
    // caller has already classified the change as non-material server-side.
    async applyNonMaterialEdit(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      fields: NonMaterialProfileFields;
    }): Promise<{ applied: boolean }> {
      await assertManager(deps.membershipReader, input.actorUserId, input.organizationId);
      const applied = await deps.profileWriter.applyNonMaterialProfile({
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        actorUserId: input.actorUserId,
        fields: input.fields
      });
      if (!applied) throw new EmployerRequestEditError("conflict", "The edit could not be applied.");
      return { applied: true };
    },

    // Record a MATERIAL change as a governed proposal. Accepted worker terms are NOT
    // mutated. Status is reconfirmation_pending when confirmed assignments are affected
    // (they must reconfirm the new terms), else proposed. Idempotency/finalization are
    // handled by the reconfirmation workflow (completeReconfirmation).
    async proposeMaterialChange(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      baseRequestVersion: number;
      materialFields: readonly string[];
      proposedValues: Record<string, unknown>;
      affectedAssignmentIds: readonly string[];
      governedRateMinor: number | null;
      currency: string | null;
      reason?: string | null;
    }): Promise<{ proposal: StoredChangeProposal }> {
      await assertManager(deps.membershipReader, input.actorUserId, input.organizationId);
      if (input.materialFields.length === 0) {
        throw new EmployerRequestEditError("invalid", "A material change requires at least one material field.");
      }
      const status: StoredChangeProposal["status"] =
        input.affectedAssignmentIds.length > 0 ? "reconfirmation_pending" : "proposed";
      const proposal = await deps.proposalStore.createProposal({
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        actorUserId: input.actorUserId,
        baseRequestVersion: input.baseRequestVersion,
        status,
        materialFields: input.materialFields,
        proposedValues: input.proposedValues,
        affectedAssignmentIds: input.affectedAssignmentIds,
        originalTermsVersion: input.baseRequestVersion,
        proposedTermsVersion: input.baseRequestVersion + 1,
        governedRateMinor: input.governedRateMinor,
        currency: input.currency,
        reason: input.reason ?? null,
        now: now()
      });
      return { proposal };
    },

    // Platform/governed completion of a reconfirmation. In this increment it records
    // the OUTCOME truthfully; the actual worker-offer reconfirmation (revised offers +
    // accept/decline) is the worker-domain workflow that drives `outcome`.
    async completeReconfirmation(input: {
      proposalId: string;
      outcome: "accepted" | "declined";
    }): Promise<{ proposal: StoredChangeProposal }> {
      const proposal = await deps.proposalStore.findById(input.proposalId);
      if (!proposal) throw new EmployerRequestEditError("not_found", "The change proposal was not found.");
      if (proposal.status === "completed" || proposal.status === "rejected") return { proposal };
      const next = input.outcome === "accepted" ? "completed" : "rejected";
      const updated = await deps.proposalStore.updateStatus(proposal.id, next, now());
      return { proposal: updated };
    },

    async listReconciliation(input?: {
      statuses?: readonly StoredChangeProposal["status"][];
      limit?: number;
    }): Promise<readonly StoredChangeProposal[]> {
      return deps.proposalStore.listByStatus(input?.statuses ?? ["reconfirmation_pending", "requires_reconciliation"], input?.limit ?? 100);
    }
  };
}

export type EmployerRequestEditService = ReturnType<typeof createEmployerRequestEditService>;

// ── Prisma adapters ──────────────────────────────────────────────────────────

type PrismaEditClient = {
  staffingRequestCalendarProfile: {
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  employerRequestChangeProposal: {
    findFirst(args: unknown): Promise<ProposalRow | null>;
    findMany(args: unknown): Promise<readonly ProposalRow[]>;
    create(args: unknown): Promise<ProposalRow>;
    update(args: unknown): Promise<ProposalRow>;
  };
};

type ProposalRow = {
  id: string;
  organizationId: string;
  jobRequestId: string;
  status: StoredChangeProposal["status"];
  materialFields: unknown;
  affectedAssignmentIds: unknown;
  originalTermsVersion: number;
  proposedTermsVersion: number;
  governedRateMinor: number | null;
  currency: string | null;
};

function proposalRowToStored(row: ProposalRow): StoredChangeProposal {
  const toStrings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobRequestId: row.jobRequestId,
    status: row.status,
    materialFields: toStrings(row.materialFields),
    affectedAssignmentIds: toStrings(row.affectedAssignmentIds),
    originalTermsVersion: row.originalTermsVersion,
    proposedTermsVersion: row.proposedTermsVersion,
    governedRateMinor: row.governedRateMinor,
    currency: row.currency
  };
}

// Non-material profile writer — updates only arrival/notes/duties, scoped to the
// request+org. Live-safe (not draft-gated): non-material by construction.
export function createPrismaProfileWriter(prismaClient: unknown): ProfileWriter {
  const prisma = prismaClient as PrismaEditClient;
  return {
    async applyNonMaterialProfile({ organizationId, jobRequestId, actorUserId, fields }) {
      const data: Record<string, unknown> = { updatedByUserId: actorUserId, updatedAt: new Date(), version: { increment: 1 } };
      if (fields.dutiesSummary !== undefined) data.dutiesSummary = fields.dutiesSummary;
      if (fields.specialInstructions !== undefined) data.specialInstructions = fields.specialInstructions;
      if (fields.addressSummary !== undefined) data.addressSummary = fields.addressSummary;
      const result = await prisma.staffingRequestCalendarProfile.updateMany({
        where: { jobRequestId, organizationId },
        data
      });
      return result.count >= 1;
    }
  };
}

export function createPrismaProposalStore(prismaClient: unknown): ProposalStore {
  const prisma = prismaClient as PrismaEditClient;
  return {
    async createProposal(input) {
      const created = await prisma.employerRequestChangeProposal.create({
        data: {
          organizationId: input.organizationId,
          jobRequestId: input.jobRequestId,
          actorUserId: input.actorUserId,
          baseRequestVersion: input.baseRequestVersion,
          status: input.status,
          materialFields: [...input.materialFields],
          proposedValues: input.proposedValues,
          affectedAssignmentIds: [...input.affectedAssignmentIds],
          originalTermsVersion: input.originalTermsVersion,
          proposedTermsVersion: input.proposedTermsVersion,
          governedRateMinor: input.governedRateMinor,
          currency: input.currency,
          reason: input.reason,
          createdAt: input.now,
          updatedAt: input.now
        }
      });
      return proposalRowToStored(created);
    },
    async findById(proposalId) {
      const row = await prisma.employerRequestChangeProposal.findFirst({ where: { id: proposalId } });
      return row ? proposalRowToStored(row) : null;
    },
    async updateStatus(proposalId, status, nowDate) {
      const updated = await prisma.employerRequestChangeProposal.update({
        where: { id: proposalId },
        data: { status, updatedAt: nowDate, version: { increment: 1 } }
      });
      return proposalRowToStored(updated);
    },
    async listByStatus(statuses, limit) {
      const rows = await prisma.employerRequestChangeProposal.findMany({
        where: { status: { in: [...statuses] } },
        orderBy: { createdAt: "desc" },
        take: limit
      });
      return rows.map(proposalRowToStored);
    }
  };
}
