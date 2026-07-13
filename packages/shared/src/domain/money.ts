export const currencies = ["CAD"] as const;

export type Currency = (typeof currencies)[number];

export type MoneyAmount = Readonly<{
  amountMinor: number;
  currency: Currency;
}>;

export function createMoneyAmount(amountMinor: number, currency: Currency = "CAD"): MoneyAmount {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Money amounts must be non-negative integer minor units.");
  }

  return { amountMinor, currency };
}
