import { formatPayOffered, parsePayOfferedView } from "@rwos/shared";

// Long-term jobs (employer plans flag) carry no Joblop rate: the API sends `payOffered` instead, the
// pay the employer offers and pays directly. `undefined` = not a long-term job (show the usual rate);
// null = long-term without a stated amount. Never shows $0, never any Joblop or employer rate.
export function payOfferedLabel(
  payOffered: unknown,
  locale: string,
  copy: Readonly<{ paidByEmployer: string; employerPaysDirectly: string }>
): string | null {
  if (payOffered === undefined) return null;
  const view = parsePayOfferedView(payOffered);
  return view ? `${formatPayOffered(view, locale)} · ${copy.paidByEmployer}` : copy.employerPaysDirectly;
}
