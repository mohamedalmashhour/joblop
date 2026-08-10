import { describe, expect, it } from "vitest";
import {
  EmployerContractError,
  createEmployerContractService,
  type ContractMembershipReader,
  type EmployerContractRepository,
  type StoredEmployerContract
} from "./employerContract";

function fakeRepository() {
  const contracts: StoredEmployerContract[] = [];
  let seq = 0;
  const repository: EmployerContractRepository = {
    async findActiveContract(organizationId) {
      return contracts.find((c) => c.organizationId === organizationId && c.status === "active") ?? null;
    },
    async supersedeActiveContracts(organizationId) {
      for (const c of contracts) {
        if (c.organizationId === organizationId && c.status === "active") {
          (c as { status: string }).status = "superseded";
        }
      }
    },
    async createSignedContract(input) {
      const contract: StoredEmployerContract = {
        id: `contract-${++seq}`,
        organizationId: input.organizationId,
        version: input.version,
        status: "active",
        currency: input.currency,
        signedByUserId: input.signedByUserId,
        signedAt: input.now,
        activatedAt: input.now,
        effectiveFrom: input.now,
        createdAt: input.now,
        updatedAt: input.now,
        roleRates: input.roleRates.map((r, i) => ({
          id: `rate-${seq}-${i}`,
          contractId: `contract-${seq}`,
          ...r
        }))
      };
      contracts.push(contract);
      return contract;
    }
  };
  return { repository, contracts };
}

function membershipReader(roleKeys: readonly string[], status = "active"): ContractMembershipReader {
  return {
    async listMemberships() {
      return [{ organizationId: "org-1", status, roleKeys }];
    }
  };
}

const OWNER = membershipReader(["ORGANIZATION_OWNER"]);
const rates = [{ workGroupId: "wg-1", roleDefinitionId: "role-1", hourlyRateMinor: 2200 }];

describe("employer contract service", () => {
  it("lets an active owner sign a contract, superseding any prior active one", async () => {
    const { repository, contracts } = fakeRepository();
    const service = createEmployerContractService(repository, OWNER);

    const first = await service.signContract({
      actorUserId: "u1",
      organizationId: "org-1",
      version: "v1",
      roleRates: rates
    });
    expect(first.status).toBe("active");
    expect(first.roleRates[0]).toMatchObject({ roleDefinitionId: "role-1", hourlyRateMinor: 2200, currency: "CAD" });

    const second = await service.signContract({
      actorUserId: "u1",
      organizationId: "org-1",
      version: "v2",
      roleRates: rates
    });
    expect(second.version).toBe("v2");
    expect(contracts.filter((c) => c.status === "active")).toHaveLength(1);
  });

  it("returns the active contract to an owner and null when none exists", async () => {
    const { repository } = fakeRepository();
    const service = createEmployerContractService(repository, OWNER);
    expect(await service.getActiveContract({ actorUserId: "u1", organizationId: "org-1" })).toBeNull();
    await service.signContract({ actorUserId: "u1", organizationId: "org-1", version: "v1", roleRates: rates });
    const active = await service.getActiveContract({ actorUserId: "u1", organizationId: "org-1" });
    expect(active?.version).toBe("v1");
  });

  it("denies a non-owner and an inactive membership", async () => {
    const { repository } = fakeRepository();
    const staff = createEmployerContractService(repository, membershipReader(["ORGANIZATION_STAFF"]));
    await expect(
      staff.getActiveContract({ actorUserId: "u1", organizationId: "org-1" })
    ).rejects.toBeInstanceOf(EmployerContractError);

    const suspended = createEmployerContractService(
      repository,
      membershipReader(["ORGANIZATION_OWNER"], "suspended")
    );
    await expect(
      suspended.signContract({ actorUserId: "u1", organizationId: "org-1", version: "v1", roleRates: rates })
    ).rejects.toBeInstanceOf(EmployerContractError);
  });

  it("rejects empty, negative, duplicate, or unlabeled rate cards", async () => {
    const { repository } = fakeRepository();
    const service = createEmployerContractService(repository, OWNER);
    const base = { actorUserId: "u1", organizationId: "org-1", version: "v1" };
    await expect(service.signContract({ ...base, roleRates: [] })).rejects.toThrow();
    await expect(
      service.signContract({ ...base, roleRates: [{ workGroupId: "wg-1", roleDefinitionId: "r", hourlyRateMinor: -1 }] })
    ).rejects.toThrow();
    await expect(
      service.signContract({
        ...base,
        roleRates: [
          { workGroupId: "wg-1", roleDefinitionId: "r", hourlyRateMinor: 100 },
          { workGroupId: "wg-1", roleDefinitionId: "r", hourlyRateMinor: 200 }
        ]
      })
    ).rejects.toThrow();
    await expect(service.signContract({ ...base, version: "", roleRates: rates })).rejects.toThrow();
  });
});
