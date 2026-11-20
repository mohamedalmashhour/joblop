export type ContractRoleRate = Readonly<{ workGroupId: string; roleDefinitionId: string; hourlyRateMinor: number }>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_HOURLY_RATE_MINOR = 100_000;

function readRate(value: unknown): ContractRoleRate | null {
  if (typeof value !== "object" || value === null) return null;
  const { workGroupId, roleDefinitionId, hourlyRateMinor } = value as Record<string, unknown>;
  if (typeof workGroupId !== "string" || !uuid.test(workGroupId)) return null;
  if (typeof roleDefinitionId !== "string" || !uuid.test(roleDefinitionId)) return null;
  if (typeof hourlyRateMinor !== "number" || !Number.isInteger(hourlyRateMinor)) return null;
  if (hourlyRateMinor <= 0 || hourlyRateMinor > MAX_HOURLY_RATE_MINOR) return null;
  return { workGroupId, roleDefinitionId, hourlyRateMinor };
}

export function readPublishRequest(input: unknown) {
  if (typeof input !== "object" || input === null) return null;
  const { organizationId, roleRates } = input as Record<string, unknown>;
  if (typeof organizationId !== "string" || !uuid.test(organizationId)) return null;
  if (!Array.isArray(roleRates) || roleRates.length === 0) return null;
  const rates = roleRates.map(readRate);
  if (rates.some((rate) => rate === null)) return null;
  return { organizationId, roleRates: rates as ContractRoleRate[] };
}

// 40 characters at most, which is the API's limit.
export function contractVersion(now: Date): string {
  return `v-${now.toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
}
