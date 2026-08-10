// ── Contract Capsule ── employer-app boundary parser (adapter). Whitelists the
// contract fields the employer UI is allowed to see, dropping anything else the API
// serializer might add. See docs/capsules/CONTRACT_CAPSULE.md.

export class ContractDtoError extends Error {
  constructor() {
    super("The contract response did not match the expected shape.");
    this.name = "ContractDtoError";
  }
}

export type EmployerContractRoleRateDto = Readonly<{
  workGroupId: string;
  roleDefinitionId: string;
  hourlyRateMinor: number;
  currency: string;
}>;

export type EmployerContractDto = Readonly<{
  id: string;
  organizationId: string;
  version: string;
  status: string;
  currency: string;
  // Owner acceptance timestamp — null until the owner has signed the rate card.
  signedAt: string | null;
  activatedAt: string | null;
  effectiveFrom: string | null;
  roleRates: readonly EmployerContractRoleRateDto[];
}>;

// Parses `{ contract: {...} | null }`. Returns null when the organization has no
// contract yet. Throws ContractDtoError on a malformed non-null contract.
export function parseEmployerContractEnvelope(input: unknown): EmployerContractDto | null {
  const record = asRecord(input);
  if (!("contract" in record) || record.contract === null) return null;
  return parseEmployerContract(record.contract);
}

export function parseEmployerContract(input: unknown): EmployerContractDto {
  const record = asRecord(input);
  const currency = requiredString(record, "currency");
  return {
    id: requiredString(record, "id"),
    organizationId: requiredString(record, "organizationId"),
    version: requiredString(record, "version"),
    status: requiredString(record, "status"),
    currency,
    signedAt: nullableString(record, "signedAt"),
    activatedAt: nullableString(record, "activatedAt"),
    effectiveFrom: nullableString(record, "effectiveFrom"),
    roleRates: parseRoleRates(record.roleRates, currency)
  };
}

function parseRoleRates(input: unknown, contractCurrency: string): readonly EmployerContractRoleRateDto[] {
  if (!Array.isArray(input)) throw new ContractDtoError();
  return input.map((raw) => {
    const rate = asRecord(raw);
    return {
      workGroupId: requiredString(rate, "workGroupId"),
      roleDefinitionId: requiredString(rate, "roleDefinitionId"),
      hourlyRateMinor: nonNegativeInteger(rate, "hourlyRateMinor"),
      // A role rate must never carry a currency different from its contract.
      currency: typeof rate.currency === "string" && rate.currency ? rate.currency : contractCurrency
    };
  });
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new ContractDtoError();
  return input as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value) throw new ContractDtoError();
  return value;
}

function nullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new ContractDtoError();
  return value;
}

function nonNegativeInteger(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new ContractDtoError();
  return value;
}
