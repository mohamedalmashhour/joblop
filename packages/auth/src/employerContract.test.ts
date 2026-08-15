import { describe, expect, it } from "vitest";
import {
  EmployerContractError,
  createEmployerContractService,
  type ContractMembershipReader,
  type ContractPlatformAuthority,
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
    async findContractEffectiveAt(organizationId, instant) {
      return (
        contracts
          .filter((c) => c.organizationId === organizationId && (c.status === "active" || c.status === "superseded") && c.effectiveFrom !== null && c.effectiveFrom.getTime() <= instant.getTime())
          .sort((a, b) => (b.effectiveFrom!.getTime() - a.effectiveFrom!.getTime()))[0] ?? null
      );
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
        // Rate card is authoritative but not yet accepted by the owner.
        signedByUserId: null,
        signedAt: null,
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
    },
    async recordOwnerSignature(contractId, signedByUserId, nowDate) {
      const contract = contracts.find((c) => c.id === contractId);
      if (!contract) throw new Error("not found");
      (contract as { signedByUserId: string | null }).signedByUserId = signedByUserId;
      (contract as { signedAt: Date | null }).signedAt = nowDate;
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

function platformAuthority(isAdmin: boolean): ContractPlatformAuthority {
  return { async isPlatformAdmin() { return isAdmin; } };
}

const OWNER = membershipReader(["ORGANIZATION_OWNER"]);
const PLATFORM = platformAuthority(true);
const NOT_PLATFORM = platformAuthority(false);
const rates = [{ workGroupId: "wg-1", roleDefinitionId: "role-1", hourlyRateMinor: 2200 }];

// Convenience: default membership OWNER, default platform authority NON-admin,
// so a test must opt in to platform-admin rate publishing explicitly.
function makeService(
  repository: EmployerContractRepository,
  opts: { membership?: ContractMembershipReader; platform?: ContractPlatformAuthority; countryCurrency?: string | undefined } = {}
) {
  return createEmployerContractService(
    repository,
    opts.membership ?? OWNER,
    opts.platform ?? NOT_PLATFORM,
    { countryCurrency: "countryCurrency" in opts ? opts.countryCurrency : "CAD" }
  );
}

describe("employer contract service", () => {
  it("lets a PLATFORM ADMIN publish a rate card, superseding any prior active one", async () => {
    const { repository, contracts } = fakeRepository();
    const service = makeService(repository, { platform: PLATFORM });

    const first = await service.signContract({
      actorUserId: "platform-1",
      organizationId: "org-1",
      version: "v1",
      roleRates: rates
    });
    expect(first.status).toBe("active");
    expect(first.signedAt).toBeNull(); // published but not yet accepted by the owner
    expect(first.roleRates[0]).toMatchObject({ roleDefinitionId: "role-1", hourlyRateMinor: 2200, currency: "CAD" });

    const second = await service.signContract({
      actorUserId: "platform-1",
      organizationId: "org-1",
      version: "v2",
      roleRates: rates
    });
    expect(second.version).toBe("v2");
    expect(contracts.filter((c) => c.status === "active")).toHaveLength(1);
  });

  it("DENIES an organization owner/administrator publishing or modifying rates (platform-admin only)", async () => {
    const { repository } = fakeRepository();
    // Owner AND administrator memberships, but NOT a platform admin.
    const orgManager = createEmployerContractService(
      repository,
      membershipReader(["ORGANIZATION_OWNER", "ORGANIZATION_ADMINISTRATOR"]),
      NOT_PLATFORM
    );
    const publish = {
      actorUserId: "owner-1",
      organizationId: "org-1",
      version: "v1",
      roleRates: rates
    };
    await expect(orgManager.signContract(publish)).rejects.toMatchObject({ code: "denied" });
    // A modification attempt (different rates/version) is likewise denied.
    await expect(
      orgManager.signContract({ ...publish, version: "v2", roleRates: [{ ...rates[0]!, hourlyRateMinor: 1 }] })
    ).rejects.toMatchObject({ code: "denied" });
    // The denial happens before any write — no contract was created.
    expect(await createEmployerContractService(repository, OWNER, PLATFORM)
      .getActiveContract({ actorUserId: "owner-1", organizationId: "org-1" })).toBeNull();
  });

  it("returns the active contract to an owner and null when none exists", async () => {
    const { repository } = fakeRepository();
    const publisher = makeService(repository, { platform: PLATFORM });
    const viewer = makeService(repository);
    expect(await viewer.getActiveContract({ actorUserId: "u1", organizationId: "org-1" })).toBeNull();
    await publisher.signContract({ actorUserId: "platform-1", organizationId: "org-1", version: "v1", roleRates: rates });
    const active = await viewer.getActiveContract({ actorUserId: "u1", organizationId: "org-1" });
    expect(active?.version).toBe("v1");
  });

  it("denies a non-owner viewing and an inactive membership acknowledging", async () => {
    const { repository } = fakeRepository();
    const staff = makeService(repository, { membership: membershipReader(["ORGANIZATION_STAFF"]) });
    await expect(
      staff.getActiveContract({ actorUserId: "u1", organizationId: "org-1" })
    ).rejects.toBeInstanceOf(EmployerContractError);

    await makeService(repository, { platform: PLATFORM }).signContract({
      actorUserId: "platform-1", organizationId: "org-1", version: "v1", roleRates: rates
    });
    const suspended = makeService(repository, {
      membership: membershipReader(["ORGANIZATION_OWNER"], "suspended")
    });
    await expect(
      suspended.acknowledgeContract({ actorUserId: "u1", organizationId: "org-1" })
    ).rejects.toBeInstanceOf(EmployerContractError);
  });

  it("rejects empty, negative, duplicate, or unlabeled rate cards (platform admin)", async () => {
    const { repository } = fakeRepository();
    const service = makeService(repository, { platform: PLATFORM });
    const base = { actorUserId: "platform-1", organizationId: "org-1", version: "v1" };
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

  it("lets an owner sign (accept) the active rate card, once, without sending rates", async () => {
    const { repository, contracts } = fakeRepository();
    await makeService(repository, { platform: PLATFORM }).signContract({
      actorUserId: "platform-1", organizationId: "org-1", version: "v1", roleRates: rates
    });
    const service = makeService(repository); // owner viewer/signer, NOT platform admin

    // Before signing: active but unsigned.
    const before = await service.getActiveContract({ actorUserId: "u1", organizationId: "org-1" });
    expect(before?.signedAt).toBeNull();

    const signed = await service.acknowledgeContract({ actorUserId: "u1", organizationId: "org-1" });
    expect(signed.signedAt).not.toBeNull();
    expect(contracts[0]?.signedByUserId).toBe("u1");

    // Second attempt is a conflict — already signed.
    await expect(
      service.acknowledgeContract({ actorUserId: "u1", organizationId: "org-1" })
    ).rejects.toMatchObject({ code: "conflict" });
  });

  // Stage 2b.3b-3: single active currency per country. The old `input.currency === "USD" ? "USD" : "CAD"`
  // coercion is REMOVED. Omitted currency uses the active country currency; an explicit currency must
  // equal it, else the contract is rejected (fail-closed, no write); an unsupported currency (e.g. SYP)
  // is no longer silently coerced to CAD. For Canada the active currency is CAD, so omitted/explicit-CAD
  // both persist "CAD" (byte-identical to before for Canada).
  it("[currency] omitted → active CAD; explicit CAD accepted; explicit USD/SYP rejected before write", async () => {
    const { repository, contracts } = fakeRepository();
    const service = makeService(repository, { platform: PLATFORM }); // countryCurrency defaults to "CAD"
    const base = { actorUserId: "platform-1", organizationId: "org-1", roleRates: rates };

    const omitted = await service.signContract({ ...base, version: "v-omitted" });
    expect(omitted.currency).toBe("CAD"); // omitted → active country currency (CAD)
    expect(omitted.roleRates[0]).toMatchObject({ currency: "CAD" });

    const cad = await service.signContract({ ...base, version: "v-cad", currency: "CAD" });
    expect(cad.currency).toBe("CAD"); // explicit CAD equals active currency → accepted

    await expect(service.signContract({ ...base, version: "v-usd", currency: "USD" })).rejects.toMatchObject({ code: "invalid" });
    await expect(service.signContract({ ...base, version: "v-syp", currency: "SYP" })).rejects.toMatchObject({ code: "invalid" });

    // Only the two accepted (CAD) contracts were written; the USD/SYP mismatches created NO rows.
    expect(contracts.map((c) => c.currency)).toEqual(["CAD", "CAD"]);
  });

  it("[currency] fails closed when no active country currency is configured (never defaults to CAD)", async () => {
    const { repository, contracts } = fakeRepository();
    const service = makeService(repository, { platform: PLATFORM, countryCurrency: undefined });
    await expect(
      service.signContract({ actorUserId: "platform-1", organizationId: "org-1", version: "v1", roleRates: rates })
    ).rejects.toMatchObject({ code: "invalid" });
    expect(contracts).toHaveLength(0); // fail-closed, zero writes
  });

  it("cannot acknowledge when no active contract exists, and denies a non-owner", async () => {
    const { repository } = fakeRepository();
    const owner = makeService(repository);
    await expect(
      owner.acknowledgeContract({ actorUserId: "u1", organizationId: "org-1" })
    ).rejects.toMatchObject({ code: "invalid" });

    await makeService(repository, { platform: PLATFORM }).signContract({
      actorUserId: "platform-1", organizationId: "org-1", version: "v1", roleRates: rates
    });
    const staff = makeService(repository, { membership: membershipReader(["ORGANIZATION_STAFF"]) });
    await expect(
      staff.acknowledgeContract({ actorUserId: "u1", organizationId: "org-1" })
    ).rejects.toBeInstanceOf(EmployerContractError);
  });
});
