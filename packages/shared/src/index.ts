export * from "./domain";

export const rwosProduct = {
  name: "Resident Workforce OS",
  baseline: "Engineering Foundation",
  implementationStatus: "foundation-only"
} as const;

export type Money = Readonly<{
  amountMinor: number;
  currency: "CAD" | "USD";
}>;

export type WorkerSafeShiftSummary = Readonly<{
  id: string;
  employerPublicName: string;
  role: string;
  startsAt: string;
  endsAt: string;
  workerPayEstimate: Money;
  urgency: "standard" | "urgent" | "emergency";
}>;
