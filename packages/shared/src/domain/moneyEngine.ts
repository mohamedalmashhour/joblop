export const moneyEngineCurrencies = ["CAD", "USD"] as const;
export const currencies = moneyEngineCurrencies;

export type MoneyEngineCurrency = (typeof moneyEngineCurrencies)[number];
export type Currency = MoneyEngineCurrency;

export type ContractMoney = Readonly<{
  amountMinor: number;
  currency: MoneyEngineCurrency;
}>;
export type MoneyAmount = ContractMoney;

export type CreateContractMoneyInput = Readonly<{
  amountMinor: number;
  currency: string;
}>;

export function createContractMoney(input: CreateContractMoneyInput): ContractMoney {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
    throw new Error("Money Engine amounts must be non-negative integer minor units.");
  }

  if (!Number.isSafeInteger(input.amountMinor)) {
    throw new Error("Money Engine amounts must be safe integer minor units.");
  }

  if (!isMoneyEngineCurrency(input.currency)) {
    throw new Error("Money Engine currency is unsupported.");
  }

  return {
    amountMinor: input.amountMinor,
    currency: input.currency
  };
}

export function addMoney(left: ContractMoney, right: ContractMoney): ContractMoney {
  assertSameCurrency([left, right]);

  return createContractMoney({
    amountMinor: left.amountMinor + right.amountMinor,
    currency: left.currency
  });
}

export function sumMoney(amounts: readonly ContractMoney[]): ContractMoney {
  if (amounts.length === 0) {
    throw new Error("Money Engine cannot sum an empty collection.");
  }

  assertSameCurrency(amounts);

  return createContractMoney({
    amountMinor: amounts.reduce((total, amount) => total + amount.amountMinor, 0),
    currency: amounts[0]!.currency
  });
}

// Subtract right from left in the same currency. The Money invariant forbids negative amounts,
// so an over-subtraction (e.g. deductions exceeding gross) is rejected rather than silently
// producing a negative balance.
export function subtractMoney(left: ContractMoney, right: ContractMoney): ContractMoney {
  assertSameCurrency([left, right]);

  const amountMinor = left.amountMinor - right.amountMinor;
  if (amountMinor < 0) {
    throw new Error("Money Engine cannot produce a negative amount. Result would be below zero.");
  }

  return createContractMoney({ amountMinor, currency: left.currency });
}

// Pro-rate an hourly rate over a number of worked minutes, in governed integer minor units:
// floor(rateMinorPerHour * minutes / 60). No floating-point path — the division is integer.
export function proRateMinutesAtHourlyRate(hourlyRate: ContractMoney, minutes: number): ContractMoney {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("Money Engine pro-rate requires non-negative integer minutes.");
  }

  return createContractMoney({
    amountMinor: Math.floor((hourlyRate.amountMinor * minutes) / 60),
    currency: hourlyRate.currency
  });
}

export function allocateMoney(total: ContractMoney, weights: readonly number[]): readonly ContractMoney[] {
  if (weights.length === 0) {
    throw new Error("Money Engine allocation requires at least one weight.");
  }

  if (weights.some((weight) => !Number.isInteger(weight) || weight <= 0)) {
    throw new Error("Money Engine allocation weights must be positive integers.");
  }

  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const rawShares = weights.map((weight, index) => {
    const numerator = total.amountMinor * weight;
    const amountMinor = Math.floor(numerator / weightTotal);

    return {
      amountMinor,
      remainder: numerator % weightTotal,
      index
    };
  });
  const distributed = rawShares.map((share) => share.amountMinor);
  const allocated = distributed.reduce((sum, amountMinor) => sum + amountMinor, 0);
  let remaining = total.amountMinor - allocated;
  const remainderOrder = [...rawShares].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.index - right.index;
  });

  for (const share of remainderOrder) {
    if (remaining <= 0) {
      break;
    }

    distributed[share.index] = distributed[share.index]! + 1;
    remaining -= 1;
  }

  return distributed.map((amountMinor) =>
    createContractMoney({ amountMinor, currency: total.currency })
  );
}

function isMoneyEngineCurrency(currency: string): currency is MoneyEngineCurrency {
  return moneyEngineCurrencies.includes(currency as MoneyEngineCurrency);
}

function assertSameCurrency(amounts: readonly ContractMoney[]) {
  const [first] = amounts;

  if (!first) {
    return;
  }

  if (amounts.some((amount) => amount.currency !== first.currency)) {
    throw new Error("Money Engine cannot combine mixed currencies. Convert to one currency first.");
  }
}
