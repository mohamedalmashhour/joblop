import { describe, expect, it } from "vitest";
import {
  ContractDtoError,
  parseEmployerContract,
  parseEmployerContractEnvelope
} from "./employerContractDto";

const validContract = {
  id: "c1",
  organizationId: "org-1",
  version: "2026-Q3",
  status: "active",
  currency: "CAD",
  signedAt: null,
  activatedAt: "2026-08-01T00:00:00.000Z",
  effectiveFrom: "2026-08-01T00:00:00.000Z",
  roleRates: [
    {
      workGroupId: "wg-1",
      roleDefinitionId: "role-chef",
      hourlyRateMinor: 3000,
      currency: "CAD",
      roleLabel: null
    }
  ]
};

describe("employer contract DTO parser", () => {
  it("returns null when the organization has no contract", () => {
    expect(parseEmployerContractEnvelope({ contract: null })).toBeNull();
    expect(parseEmployerContractEnvelope({})).toBeNull();
  });

  it("parses a valid contract and whitelists only the allowed fields", () => {
    const parsed = parseEmployerContract({
      ...validContract,
      // Fields the API must never leak to the employer UI:
      createdByUserId: "admin-9",
      signedByUserId: "owner-1",
      secretInternalNote: "drop me"
    });
    expect(parsed).toEqual(validContract);
    expect(parsed).not.toHaveProperty("createdByUserId");
    expect(parsed).not.toHaveProperty("signedByUserId");
    expect(parsed).not.toHaveProperty("secretInternalNote");
  });

  it("defaults a role rate's currency to the contract currency", () => {
    const parsed = parseEmployerContract({
      ...validContract,
      roleRates: [{ workGroupId: "wg-1", roleDefinitionId: "role-chef", hourlyRateMinor: 3000 }]
    });
    expect(parsed.roleRates[0]?.currency).toBe("CAD");
  });

  it("rejects a non-integer / negative rate and a malformed shape", () => {
    expect(() =>
      parseEmployerContract({
        ...validContract,
        roleRates: [{ workGroupId: "wg-1", roleDefinitionId: "r", hourlyRateMinor: -1, currency: "CAD" }]
      })
    ).toThrow(ContractDtoError);
    expect(() => parseEmployerContract({ ...validContract, roleRates: "nope" })).toThrow(ContractDtoError);
    expect(() => parseEmployerContract({ ...validContract, id: "" })).toThrow(ContractDtoError);
  });
});
