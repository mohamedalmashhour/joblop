import type { ContractRoleRate } from "../api/employer-contracts/contractRequest";

export type CatalogueRole = Readonly<{ id: string; workGroupId: string; displayLabel: string }>;
export type CatalogueGroup = Readonly<{ id: string; displayLabel: string }>;

// "2" or "2.50" to cents. Null when it is not a clean positive amount; blank means not priced.
export function dollarsToMinor(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(text)) return null;
  const [dollars = "0", cents = ""] = text.split(".");
  const minor = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return minor > 0 ? minor : null;
}

export function minorToDollars(minor: number): string {
  return (minor / 100).toFixed(2);
}

// The rates to publish. Blank roles are left out; any bad amount stops the whole card.
export function toRoleRates(
  roles: readonly CatalogueRole[],
  entries: Readonly<Record<string, string>>
): { rates: ContractRoleRate[]; invalid: string[] } {
  const rates: ContractRoleRate[] = [];
  const invalid: string[] = [];
  for (const role of roles) {
    const entry = entries[role.id]?.trim();
    if (!entry) continue;
    const hourlyRateMinor = dollarsToMinor(entry);
    if (hourlyRateMinor === null) invalid.push(role.displayLabel);
    else rates.push({ workGroupId: role.workGroupId, roleDefinitionId: role.id, hourlyRateMinor });
  }
  return { rates, invalid };
}
