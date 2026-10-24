// Phase 2 of the two-channel pay design (docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md).
// Given a locked payroll calculation (whose classification came from the worker's signed election),
// resolve which payment CHANNEL it belongs to and the statement the worker should see. Pure and
// deterministic — no I/O, no money moved. The money itself is still gated OFF.
//
//  - Employee  -> "payroll" channel, a T4 pay statement: gross − deductions = net take-home.
//  - Contractor-> "contractor" channel, a T4A fee statement: paid gross, no source deductions.

export type PayChannel = "payroll" | "contractor";
export type SlipType = "T4" | "T4A";

// Québec sales-tax rates (BEST-GUESS flow pending CPA sign-off): GST 5%, QST 9.975%. A GST/QST-
// registered contractor adds these to their fee; the platform pays them and the contractor remits
// them. Kept as exact integer-minor math (no floating point).
export const GST_RATE_PPM = 50_000; // 5.000%  (parts per million)
export const QST_RATE_PPM = 99_750; // 9.975%
const taxOf = (amountMinor: number, ppm: number) => Math.floor((amountMinor * ppm) / 1_000_000);

export type SalesTax = Readonly<{ gstMinor: number; qstMinor: number }>;

export type PayStatementLine = Readonly<{
  label: string;
  amountMinor: number; // signed: deductions are negative
  kind: "earning" | "deduction" | "total" | "note";
}>;

export type PayChannelResult = Readonly<{
  channel: PayChannel;
  slipType: SlipType;
  workerReceivesMinor: number; // what lands in the worker's payout (incl. collected sales tax for a registered contractor)
  employerCostMinor: number; // employer's statutory cost (payroll channel only; 0 for contractor)
  currency: string;
  statementTitle: string;
  statementLines: readonly PayStatementLine[];
  // Sales tax the contractor collects on their fee and must remit (only when registered); null otherwise.
  salesTax: SalesTax | null;
}>;

export type PayChannelInput = Readonly<{
  classification: string; // "employee" | "contractor" (anything else is treated as employee, fail-safe)
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  totalEmployerCostMinor: number;
  currency: string;
  gstQstRegistered?: boolean; // contractor only
}>;

export function resolvePayChannel(input: PayChannelInput): PayChannelResult {
  const isContractor = input.classification === "contractor";
  if (isContractor) {
    const registered = input.gstQstRegistered === true;
    const gstMinor = registered ? taxOf(input.grossPayMinor, GST_RATE_PPM) : 0;
    const qstMinor = registered ? taxOf(input.grossPayMinor, QST_RATE_PPM) : 0;
    const totalPaidMinor = input.grossPayMinor + gstMinor + qstMinor;
    const lines: PayStatementLine[] = [{ label: "Fee for services", amountMinor: input.grossPayMinor, kind: "earning" }];
    if (registered) {
      lines.push({ label: "GST collected (5%) — you remit", amountMinor: gstMinor, kind: "earning" });
      lines.push({ label: "QST collected (9.975%) — you remit", amountMinor: qstMinor, kind: "earning" });
    } else {
      lines.push({ label: "Source deductions", amountMinor: 0, kind: "note" });
    }
    lines.push({ label: registered ? "Total invoice (fee + GST/QST)" : "Total paid (gross)", amountMinor: totalPaidMinor, kind: "total" });
    return {
      channel: "contractor",
      slipType: "T4A",
      workerReceivesMinor: totalPaidMinor,
      employerCostMinor: 0,
      currency: input.currency,
      statementTitle: "Contractor fee statement (T4A)",
      statementLines: lines,
      salesTax: registered ? { gstMinor, qstMinor } : null
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
    ],
    salesTax: null
  };
}
