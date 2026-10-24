// Phase 2 of the two-channel pay design (docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md).
// Given a locked payroll calculation (whose classification came from the worker's signed election),
// resolve which payment CHANNEL it belongs to and the statement the worker should see. Pure and
// deterministic — no I/O, no money moved. The money itself is still gated OFF.
//
//  - Employee  -> "payroll" channel, a T4 pay statement: gross − deductions = net take-home.
//  - Contractor-> "contractor" channel, a T4A fee statement: paid gross, no source deductions.

export type PayChannel = "payroll" | "contractor";
export type SlipType = "T4" | "T4A";

export type PayStatementLine = Readonly<{
  label: string;
  amountMinor: number; // signed: deductions are negative
  kind: "earning" | "deduction" | "total" | "note";
}>;

export type PayChannelResult = Readonly<{
  channel: PayChannel;
  slipType: SlipType;
  workerReceivesMinor: number; // what lands in the worker's payout
  employerCostMinor: number; // employer's statutory cost (payroll channel only; 0 for contractor)
  currency: string;
  statementTitle: string;
  statementLines: readonly PayStatementLine[];
}>;

export type PayChannelInput = Readonly<{
  classification: string; // "employee" | "contractor" (anything else is treated as employee, fail-safe)
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  totalEmployerCostMinor: number;
  currency: string;
}>;

export function resolvePayChannel(input: PayChannelInput): PayChannelResult {
  const isContractor = input.classification === "contractor";
  if (isContractor) {
    return {
      channel: "contractor",
      slipType: "T4A",
      workerReceivesMinor: input.grossPayMinor,
      employerCostMinor: 0,
      currency: input.currency,
      statementTitle: "Contractor fee statement (T4A)",
      statementLines: [
        { label: "Fee for services", amountMinor: input.grossPayMinor, kind: "earning" },
        { label: "Source deductions", amountMinor: 0, kind: "note" },
        { label: "Total paid (gross)", amountMinor: input.grossPayMinor, kind: "total" }
      ]
    };
  }
  return {
    channel: "payroll",
    slipType: "T4",
    workerReceivesMinor: input.netPayMinor,
    employerCostMinor: input.totalEmployerCostMinor,
    currency: input.currency,
    statementTitle: "Pay statement (T4)",
    statementLines: [
      { label: "Gross earnings", amountMinor: input.grossPayMinor, kind: "earning" },
      { label: "Source deductions (QPP, QPIP, income tax)", amountMinor: -input.totalDeductionsMinor, kind: "deduction" },
      { label: "Net pay", amountMinor: input.netPayMinor, kind: "total" }
    ]
  };
}
