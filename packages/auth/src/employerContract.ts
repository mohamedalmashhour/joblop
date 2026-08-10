// ── Contract Capsule ── service + Prisma repository. Isolated, reusable feature unit;
// see docs/capsules/CONTRACT_CAPSULE.md for the public surface + lift instructions.
//
// Employer<->platform contract service. The contract holds the authoritative
// per-role hourly rate a job request reads — the request never invents a price.
// Only an active OWNER/ADMINISTRATOR member of the organization may read or sign it.

const CONTRACT_MANAGER_ROLES: readonly string[] = [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMINISTRATOR"
];

export type ContractRoleRateInput = Readonly<{
  workGroupId: string;
  roleDefinitionId: string;
  hourlyRateMinor: number;
}>;

export type StoredContractRoleRate = Readonly<{
  id: string;
  contractId: string;
  workGroupId: string;
  roleDefinitionId: string;
  hourlyRateMinor: number;
}>;

export type StoredEmployerContract = Readonly<{
  id: string;
  organizationId: string;
  version: string;
  status: "draft" | "signed" | "active" | "superseded";
  currency: string;
  signedByUserId: string | null;
  signedAt: Date | null;
  activatedAt: Date | null;
  effectiveFrom: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roleRates: readonly StoredContractRoleRate[];
}>;

export type EmployerContractRepository = Readonly<{
  findActiveContract(organizationId: string): Promise<StoredEmployerContract | null>;
  supersedeActiveContracts(organizationId: string, now: Date): Promise<void>;
  // Establishes the authoritative rate card (platform/admin authority). Rates are
  // server-side from here on; the employer never re-supplies them.
  createSignedContract(input: {
    organizationId: string;
    version: string;
    currency: string;
    signedByUserId: string;
    roleRates: readonly ContractRoleRateInput[];
    now: Date;
  }): Promise<StoredEmployerContract>;
  // Records the organization owner's signature on the active contract. Carries no
  // rates — it only marks the governed rate card as accepted.
  recordOwnerSignature(
    contractId: string,
    signedByUserId: string,
    now: Date
  ): Promise<StoredEmployerContract>;
}>;

// Minimal structural view of the membership service (avoids a circular import).
export type ContractMembershipReader = Readonly<{
  listMemberships(userId: string): Promise<
    readonly Readonly<{
      organizationId: string;
      status: string;
      roleKeys: readonly string[];
    }>[]
  >;
}>;

export type EmployerContractErrorCode = "denied" | "invalid" | "conflict";

export class EmployerContractError extends Error {
  readonly code: EmployerContractErrorCode;

  constructor(code: EmployerContractErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EmployerContractError";
  }
}

export type PublicContractRoleRate = Readonly<{
  workGroupId: string;
  roleDefinitionId: string;
  hourlyRateMinor: number;
  currency: string;
}>;

export type PublicEmployerContract = Readonly<{
  id: string;
  organizationId: string;
  version: string;
  status: string;
  currency: string;
  signedAt: string | null;
  activatedAt: string | null;
  effectiveFrom: string | null;
  roleRates: readonly PublicContractRoleRate[];
}>;

function toPublicContract(contract: StoredEmployerContract): PublicEmployerContract {
  return {
    id: contract.id,
    organizationId: contract.organizationId,
    version: contract.version,
    status: contract.status,
    currency: contract.currency,
    signedAt: contract.signedAt?.toISOString() ?? null,
    activatedAt: contract.activatedAt?.toISOString() ?? null,
    effectiveFrom: contract.effectiveFrom?.toISOString() ?? null,
    roleRates: contract.roleRates.map((rate) => ({
      workGroupId: rate.workGroupId,
      roleDefinitionId: rate.roleDefinitionId,
      hourlyRateMinor: rate.hourlyRateMinor,
      currency: contract.currency
    }))
  };
}

async function assertContractManager(
  membershipReader: ContractMembershipReader,
  actorUserId: string,
  organizationId: string
) {
  const memberships = await membershipReader.listMemberships(actorUserId);
  const membership = memberships.find(
    (item) => item.organizationId === organizationId && item.status === "active"
  );
  const allowed =
    membership !== undefined &&
    membership.roleKeys.some((role) => CONTRACT_MANAGER_ROLES.includes(role));
  if (!allowed) {
    throw new EmployerContractError(
      "denied",
      "An active organization owner or administrator is required to manage the contract."
    );
  }
}

export function createEmployerContractService(
  repository: EmployerContractRepository,
  membershipReader: ContractMembershipReader,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async getActiveContract(input: { actorUserId: string; organizationId: string }) {
      await assertContractManager(membershipReader, input.actorUserId, input.organizationId);
      const contract = await repository.findActiveContract(input.organizationId);
      return contract ? toPublicContract(contract) : null;
    },

    async signContract(input: {
      actorUserId: string;
      organizationId: string;
      version: string;
      currency?: string;
      roleRates: readonly ContractRoleRateInput[];
    }) {
      await assertContractManager(membershipReader, input.actorUserId, input.organizationId);

      const version = input.version.trim();
      if (version.length < 1 || version.length > 40) {
        throw new EmployerContractError("invalid", "A contract version label (1-40 chars) is required.");
      }
      const currency = input.currency === "USD" ? "USD" : "CAD";
      if (!input.roleRates.length) {
        throw new EmployerContractError("invalid", "At least one role rate is required to sign.");
      }
      const seenRoles = new Set<string>();
      for (const rate of input.roleRates) {
        if (!rate.roleDefinitionId.trim() || !rate.workGroupId.trim()) {
          throw new EmployerContractError("invalid", "Each rate needs a role and a work group.");
        }
        if (!Number.isInteger(rate.hourlyRateMinor) || rate.hourlyRateMinor < 0) {
          throw new EmployerContractError(
            "invalid",
            "Each hourly rate must be a non-negative integer (minor units)."
          );
        }
        if (seenRoles.has(rate.roleDefinitionId)) {
          throw new EmployerContractError("invalid", "Each role may appear only once in the rate card.");
        }
        seenRoles.add(rate.roleDefinitionId);
      }

      const currentTime = now();
      await repository.supersedeActiveContracts(input.organizationId, currentTime);
      const contract = await repository.createSignedContract({
        organizationId: input.organizationId,
        version,
        currency,
        signedByUserId: input.actorUserId,
        roleRates: input.roleRates,
        now: currentTime
      });
      return toPublicContract(contract);
    },

    // The employer owner accepts the governed rate card. Security: this action
    // carries NO rates — the browser cannot set or alter a price. It only records
    // the owner's signature on the server-authoritative active contract.
    async acknowledgeContract(input: { actorUserId: string; organizationId: string }) {
      await assertContractManager(membershipReader, input.actorUserId, input.organizationId);
      const contract = await repository.findActiveContract(input.organizationId);
      if (!contract) {
        throw new EmployerContractError(
          "invalid",
          "There is no active contract to sign. The platform must publish a rate card first."
        );
      }
      if (contract.signedAt !== null) {
        throw new EmployerContractError(
          "conflict",
          "This contract has already been signed."
        );
      }
      const signed = await repository.recordOwnerSignature(
        contract.id,
        input.actorUserId,
        now()
      );
      return toPublicContract(signed);
    }
  };
}

export type EmployerContractService = ReturnType<typeof createEmployerContractService>;

// Structural view of the Prisma client subset this repository needs.
type PrismaEmployerContractClient = {
  employerContract: {
    findFirst(args: unknown): Promise<StoredEmployerContract | null>;
    updateMany(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<StoredEmployerContract>;
    update(args: unknown): Promise<StoredEmployerContract>;
  };
};

export function createPrismaEmployerContractRepository(
  prismaClient: unknown
): EmployerContractRepository {
  const prisma = prismaClient as PrismaEmployerContractClient;

  return {
    findActiveContract(organizationId) {
      return prisma.employerContract.findFirst({
        where: { organizationId, status: "active" },
        include: { roleRates: true },
        orderBy: { activatedAt: "desc" }
      });
    },
    async supersedeActiveContracts(organizationId, nowDate) {
      await prisma.employerContract.updateMany({
        where: { organizationId, status: "active" },
        data: { status: "superseded", updatedAt: nowDate }
      });
    },
    createSignedContract(input) {
      // The rate card is authoritative from creation, but the owner has not yet
      // accepted it: signedByUserId/signedAt stay null until recordOwnerSignature.
      return prisma.employerContract.create({
        data: {
          organizationId: input.organizationId,
          version: input.version,
          status: "active",
          currency: input.currency,
          signedByUserId: null,
          signedAt: null,
          activatedAt: input.now,
          effectiveFrom: input.now,
          createdByUserId: input.signedByUserId,
          roleRates: {
            create: input.roleRates.map((rate) => ({
              workGroupId: rate.workGroupId,
              roleDefinitionId: rate.roleDefinitionId,
              hourlyRateMinor: rate.hourlyRateMinor
            }))
          }
        },
        include: { roleRates: true }
      });
    },
    recordOwnerSignature(contractId, signedByUserId, nowDate) {
      return prisma.employerContract.update({
        where: { id: contractId },
        data: { signedByUserId, signedAt: nowDate, updatedAt: nowDate },
        include: { roleRates: true }
      });
    }
  };
}
