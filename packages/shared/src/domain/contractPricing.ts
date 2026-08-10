// ── Contract Capsule ── core pricing domain (portable). Isolated, reusable feature
// unit: employer<->platform contract rate card + governed request pricing. Lift into
// the next platform as-is; depends only on the money engine.
// See docs/capsules/CONTRACT_CAPSULE.md.
import { createContractMoney, type Currency, type MoneyAmount } from "./moneyEngine";

// A single role's governed hourly rate, taken from an active employer<->platform
// contract's rate card. A job request reads this — it never invents a price.
export type ContractRoleHourlyRate = Readonly<{
  roleDefinitionId: string;
  workGroupId: string;
  hourlyRate: MoneyAmount;
}>;

// The active contract's rate card, as a request reads it.
export type EmployerContractRateCard = Readonly<{
  contractVersion: string;
  currency: Currency;
  roleRates: readonly ContractRoleHourlyRate[];
}>;

export function contractRoleHourlyRate(input: {
  roleDefinitionId: string;
  workGroupId: string;
  hourlyRateMinor: number;
  currency: string;
}): ContractRoleHourlyRate {
  if (!input.roleDefinitionId.trim() || !input.workGroupId.trim()) {
    throw new Error("A contract role rate requires a role and a work group.");
  }
  return {
    roleDefinitionId: input.roleDefinitionId,
    workGroupId: input.workGroupId,
    hourlyRate: createContractMoney({
      amountMinor: input.hourlyRateMinor,
      currency: input.currency
    })
  };
}

// The governed rate a request applies for a chosen role — resolved from the
// active contract's rate card. Returns null when the contract does not price
// that role (the request cannot proceed to a priced state without it).
export function resolveRoleHourlyRate(
  rateCard: EmployerContractRateCard,
  roleDefinitionId: string
): MoneyAmount | null {
  const match = rateCard.roleRates.find((rate) => rate.roleDefinitionId === roleDefinitionId);
  return match ? match.hourlyRate : null;
}

// Estimated request cost = governed hourly rate x scheduled hours x worker count.
export function estimateRequestCost(input: {
  hourlyRate: MoneyAmount;
  hours: number;
  workers: number;
}): MoneyAmount {
  if (!Number.isFinite(input.hours) || input.hours < 0) {
    throw new Error("Estimated hours must be a non-negative number.");
  }
  if (!Number.isInteger(input.workers) || input.workers < 1) {
    throw new Error("Worker count must be a positive integer.");
  }
  const totalMinor = Math.round(input.hourlyRate.amountMinor * input.hours * input.workers);
  return createContractMoney({ amountMinor: totalMinor, currency: input.hourlyRate.currency });
}

// Whole scheduled hours between two ISO timestamps (0 when invalid or non-positive).
export function hoursBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

// Display helpers.
export function formatMoney(money: MoneyAmount): string {
  return (money.amountMinor / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: money.currency
  });
}

export function formatHourlyRate(rate: MoneyAmount): string {
  return `${formatMoney(rate)}/hr`;
}
