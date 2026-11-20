// ── Contract Capsule ── service + Prisma repository. Isolated, reusable feature unit;
// see docs/capsules/CONTRACT_CAPSULE.md for the public surface + lift instructions.
//
// Employer<->platform contract service. The contract holds the authoritative
// per-role hourly rate a job request reads — the request never invents a price.
// Only an active OWNER/ADMINISTRATOR member of the organization may read or sign it.

import { belowMinimumWageMessage, isBelowMinimumWage } from "@rwos/shared";

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
  // Historical rate authority for payroll: the governed contract in force at `instant` — the
  // most recent contract (active OR superseded) whose effectiveFrom <= instant. Superseded
  // contracts are retained, so a calculation over past work always reads the committed rate that
  // governed then, never the "current" rate. Read-only over existing committed contract history.
  findContractEffectiveAt(organizationId: string, instant: Date): Promise<StoredEmployerContract | null>;
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

// Platform-admin authority — the ONLY authority allowed to publish/modify a
// governed rate card. This is a platform grant, never an organization membership
// role (the role resolver strips PLATFORM_ADMINISTRATOR from membership roles), so
// an Organization Owner/Administrator can never satisfy it.
export type ContractPlatformAuthority = Readonly<{
  isPlatformAdmin(userId: string): Promise<boolean>;
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

// View/acknowledge authority: an active organization OWNER/ADMINISTRATOR member.
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
      "An active organization owner or administrator is required to view or sign the contract."
    );
  }
}

// Rate-card authority: platform admin only. Fails closed if no authority is wired.
async function assertPlatformAdmin(
  platformAuthority: ContractPlatformAuthority | undefined,
  actorUserId: string
) {
  const allowed = platformAuthority ? await platformAuthority.isPlatformAdmin(actorUserId) : false;
  if (!allowed) {
    throw new EmployerContractError(
      "denied",
      "Only a platform administrator may publish or modify governed rates."
    );
  }
}

export function createEmployerContractService(
  repository: EmployerContractRepository,
  membershipReader: ContractMembershipReader,
  platformAuthority: ContractPlatformAuthority,
  // Stage 2b.3b-3: `countryCurrency` is the active country's currency (from CountryProfile.currency),
  // threaded from the API composition root. Single active currency per country: a signed contract's
  // currency MUST equal it. Absent → fail closed (never an implicit CAD default).
  options: { now?: () => Date; countryCurrency?: string | undefined } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async getActiveContract(input: { actorUserId: string; organizationId: string }) {
      await assertContractManager(membershipReader, input.actorUserId, input.organizationId);
      const contract = await repository.findActiveContract(input.organizationId);
      return contract ? toPublicContract(contract) : null;
    },

    // Staff reading a company's rate card before replacing it. Platform-admin authority only.
    async getActiveContractForPlatform(input: { actorUserId: string; organizationId: string }) {
      await assertPlatformAdmin(platformAuthority, input.actorUserId);
      const contract = await repository.findActiveContract(input.organizationId);
      return contract ? toPublicContract(contract) : null;
    },

    // Publish/replace the governed rate card. Platform-admin authority ONLY — an
    // organization owner/administrator is denied here, so a client cannot create,
    // publish, modify, or override governed rates.
    async signContract(input: {
      actorUserId: string;
      organizationId: string;
      version: string;
      currency?: string;
      roleRates: readonly ContractRoleRateInput[];
    }) {
      await assertPlatformAdmin(platformAuthority, input.actorUserId);

      const version = input.version.trim();
      if (version.length < 1 || version.length > 40) {
        throw new EmployerContractError("invalid", "A contract version label (1-40 chars) is required.");
      }
      // Single active currency per country (no silent invalid→CAD coercion, no arbitrary USD).
      const countryCurrency = options.countryCurrency;
      if (countryCurrency === undefined) {
        throw new EmployerContractError("invalid", "Currency is not configured for the selected country.");
      }
      if (input.currency !== undefined && input.currency !== countryCurrency) {
        throw new EmployerContractError("invalid", `Contract currency must match the active country currency (${countryCurrency}).`);
      }
      const currency = countryCurrency;
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
        // Québec minimum wage: the worker's pay is this rate minus Joblop's share, so a rate below
        // the minimum can never pay the worker enough. Refused here, before any job is priced on it.
        if (isBelowMinimumWage({ workerHourlyRateMinor: rate.hourlyRateMinor, currency, at: now() })) {
          throw new EmployerContractError("invalid", belowMinimumWageMessage(now()));
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
    findContractEffectiveAt(organizationId, instant) {
      // active + superseded contracts whose effectiveFrom <= instant, newest effective first. Ties
      // on effectiveFrom are broken deterministically by activation recency (a later-activated
      // contract for the same effective date is the authoritative correction). draft contracts are
      // never rate authority. This is the committed contract timeline.
      return prisma.employerContract.findFirst({
        where: {
          organizationId,
          status: { in: ["active", "superseded"] },
          effectiveFrom: { not: null, lte: instant }
        },
        include: { roleRates: true },
        orderBy: [{ effectiveFrom: "desc" }, { activatedAt: "desc" }, { createdAt: "desc" }]
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
