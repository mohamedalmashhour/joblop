// Phase 4 of the two-channel pay design (docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md).
// The accountant's view: one strict, simple summary of the whole money flow over LOCKED payroll.
// Derived from source so it always reconciles. The double-entry identity holds by construction:
//
//   employer billed (money in)  ==  worker net + deductions + employer cost + platform net
//
// i.e. every dollar a client is billed is accounted for: paid to the worker, owed to CRA/Revenu
// Québec, or kept by the platform. Surfaces the TRUE platform margin after the employer-side payroll
// burden (an employee's nominal spread is eaten by employer contributions + vacation accrual).

export type AccountingCalcRow = Readonly<{
  channel: string; // "employee" | "contractor"
  employerBilledMinor: number; // billable minutes x employer rate
  workerGrossMinor: number;
  deductionsMinor: number;
  employerCostMinor: number;
  workerNetMinor: number;
}>;

export type AccountingGroup = Readonly<{
  channel: "payroll" | "contractor";
  employerBilledMinor: number;
  workerNetMinor: number;
  taxesOwedMinor: number; // deductions + employer cost (owed to CRA/Revenu Québec)
  platformNetMinor: number; // employer billed - worker gross - employer cost
  balances: boolean; // the double-entry identity holds
}>;

export type AccountingSummary = Readonly<{
  currency: string;
  groups: readonly AccountingGroup[];
  total: AccountingGroup;
  gated: true;
}>;

function groupOf(channel: "payroll" | "contractor", rows: readonly AccountingCalcRow[]): AccountingGroup {
  const employerBilledMinor = rows.reduce((s, r) => s + r.employerBilledMinor, 0);
  const workerGrossMinor = rows.reduce((s, r) => s + r.workerGrossMinor, 0);
  const workerNetMinor = rows.reduce((s, r) => s + r.workerNetMinor, 0);
  const deductionsMinor = rows.reduce((s, r) => s + r.deductionsMinor, 0);
  const employerCostMinor = rows.reduce((s, r) => s + r.employerCostMinor, 0);
  const platformNetMinor = employerBilledMinor - workerGrossMinor - employerCostMinor;
  const taxesOwedMinor = deductionsMinor + employerCostMinor;
  const balances = employerBilledMinor === workerNetMinor + deductionsMinor + employerCostMinor + platformNetMinor;
  return { channel, employerBilledMinor, workerNetMinor, taxesOwedMinor, platformNetMinor, balances };
}

export function buildAccounting(rows: readonly AccountingCalcRow[], currency: string): AccountingSummary {
  const employee = rows.filter((r) => r.channel !== "contractor");
  const contractor = rows.filter((r) => r.channel === "contractor");
  const groups: AccountingGroup[] = [];
  if (employee.length) groups.push(groupOf("payroll", employee));
  if (contractor.length) groups.push(groupOf("contractor", contractor));
  return { currency, groups, total: groupOf("payroll", rows), gated: true };
}
