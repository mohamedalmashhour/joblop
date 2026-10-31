export * from "./domain";
export * from "./country";

import type { ContractMoney } from "./domain";

export const rwosProduct = {
  name: "Resident Workforce OS",
  baseline: "Engineering Foundation",
  implementationStatus: "foundation-only"
} as const;

export type Money = ContractMoney;

export type WorkerSafeShiftSummary = Readonly<{
  id: string;
  employerPublicName: string;
  role: string;
  startsAt: string;
  endsAt: string;
  workerPayEstimate: Money;
  urgency: "standard" | "urgent" | "emergency";
}>;
