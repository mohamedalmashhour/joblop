// Phase 3b of the two-channel pay design (docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md).
// Year-end slips derived from a worker's LOCKED payroll for a tax year: a T4 for employee pay and a
// T4A for contractor fees. SYNTHETIC / simplified boxes pending CPA sign-off on the real slip
// mapping (a Québec employee also gets an RL-1; QPP and QPIP are separate boxes). Derived from source,
// so it always reconciles; nothing is filed while the go-live gate is closed.

export type SlipType = "T4" | "T4A";

export type SlipCalcInput = Readonly<{
  classification: string; // "employee" | "contractor"
  grossPayMinor: number;
  deductionsByCode: Readonly<Record<string, number>>; // federal_tax, provincial_tax, social_insurance
  employerCostMinor: number;
  gstQstCollectedMinor: number; // contractor, if registered
}>;

export type TaxSlip = Readonly<{
  slipType: SlipType;
  taxYear: number;
  currency: string;
  boxes: Readonly<Record<string, number>>;
  synthetic: true;
}>;

// Produce one slip per classification present in the year (a worker reclassified mid-year gets both).
export function buildTaxSlips(
  taxYear: number,
  currency: string,
  calcs: readonly SlipCalcInput[]
): readonly TaxSlip[] {
  const employee = calcs.filter((c) => c.classification !== "contractor");
  const contractor = calcs.filter((c) => c.classification === "contractor");
  const slips: TaxSlip[] = [];

  if (employee.length > 0) {
    const income = employee.reduce((s, c) => s + c.grossPayMinor, 0);
    const incomeTax = employee.reduce((s, c) => s + (c.deductionsByCode.federal_tax ?? 0) + (c.deductionsByCode.provincial_tax ?? 0), 0);
    const qppQpip = employee.reduce((s, c) => s + (c.deductionsByCode.social_insurance ?? 0), 0);
    const employerContrib = employee.reduce((s, c) => s + c.employerCostMinor, 0);
    slips.push({
      slipType: "T4",
      taxYear,
      currency,
      boxes: {
        box14_employmentIncome: income,
        box22_incomeTaxDeducted: incomeTax,
        qpp_qpip_withheld: qppQpip,
        employer_contributions: employerContrib
      },
      synthetic: true
    });
  }

  if (contractor.length > 0) {
    const fees = contractor.reduce((s, c) => s + c.grossPayMinor, 0);
    const gstQst = contractor.reduce((s, c) => s + c.gstQstCollectedMinor, 0);
    slips.push({
      slipType: "T4A",
      taxYear,
      currency,
      boxes: {
        box048_feesForServices: fees,
        gst_qst_collected: gstQst
      },
      synthetic: true
    });
  }

  return slips;
}
