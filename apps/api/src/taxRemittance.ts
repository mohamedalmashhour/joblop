// Phase 3 of the two-channel pay design (docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md).
// A derived remittance ledger: what the platform owes CRA (federal) and Revenu Québec (provincial +
// QPP/QPIP + employer contributions) from LOCKED payroll. Computed from the persisted payroll
// deduction + employer-cost lines so it always reconciles to source and cannot drift. Every amount
// is "accrued" — nothing is filed or paid while the go-live gate is closed.

export type RemittanceAuthority = "CRA" | "REVENU_QUEBEC";

// Which authority each payroll line code is remitted to. federal income tax -> CRA; provincial tax,
// QPP/QPIP (labelled social_insurance here) and the employer contribution -> Revenu Québec.
export const REMITTANCE_AUTHORITY_BY_CODE: Readonly<Record<string, RemittanceAuthority>> = {
  federal_tax: "CRA",
  provincial_tax: "REVENU_QUEBEC",
  social_insurance: "REVENU_QUEBEC",
  employer_contribution: "REVENU_QUEBEC"
};

export function authorityFor(code: string): RemittanceAuthority {
  // Unknown codes default to CRA and are surfaced by their code so they are reviewed, never hidden.
  return REMITTANCE_AUTHORITY_BY_CODE[code] ?? "CRA";
}

export type RemittanceLineInput = Readonly<{ code: string; amountMinor: number }>;
export type RemittanceItem = Readonly<{ code: string; amountMinor: number }>;
export type RemittanceGroup = Readonly<{
  authority: RemittanceAuthority;
  status: "accrued";
  items: readonly RemittanceItem[];
  totalMinor: number;
}>;
export type RemittanceSummary = Readonly<{
  currency: string;
  groups: readonly RemittanceGroup[];
  grandTotalMinor: number;
  gated: true;
}>;

export function buildRemittanceSummary(
  lines: readonly RemittanceLineInput[],
  currency: string
): RemittanceSummary {
  const byAuthority = new Map<RemittanceAuthority, Map<string, number>>();
  for (const line of lines) {
    const authority = authorityFor(line.code);
    const codes = byAuthority.get(authority) ?? new Map<string, number>();
    codes.set(line.code, (codes.get(line.code) ?? 0) + line.amountMinor);
    byAuthority.set(authority, codes);
  }
  const groups: RemittanceGroup[] = [...byAuthority.entries()]
    .map(([authority, codes]) => {
      const items = [...codes.entries()]
        .map(([code, amountMinor]) => ({ code, amountMinor }))
        .sort((a, b) => a.code.localeCompare(b.code));
      return {
        authority,
        status: "accrued" as const,
        items,
        totalMinor: items.reduce((sum, i) => sum + i.amountMinor, 0)
      };
    })
    .sort((a, b) => a.authority.localeCompare(b.authority));
  return {
    currency,
    groups,
    grandTotalMinor: groups.reduce((sum, g) => sum + g.totalMinor, 0),
    gated: true
  };
}
