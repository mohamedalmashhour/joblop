import { payOfferedFromForm, type PayOffered } from "@rwos/shared";

// Rules of the job request form for a LONG-TERM job (employer plans flag). A long-term job is a paid
// listing: the employer pays the worker directly, so the form neither needs a priced contract rate
// nor shows hourly cost estimates for it; it asks for the pay offered instead. With the flag off, or
// for a short-term job, every rule returns today's behaviour.

export type JobLengthChoice = "short_term" | "long_term";

export type PayOfferedFields = Readonly<{ payMin: string; payMax: string; payUnit: string }>;

export function isLongTermRequest(plansEnabled: boolean, jobLength: JobLengthChoice): boolean {
  return plansEnabled && jobLength === "long_term";
}

export type RequestPricingGate = Readonly<{
  longTerm: boolean;
  /** Block "Review request" because the chosen role has no contract rate (short-term only). */
  rateUnpriced: boolean;
  /** Show the contract rate and the hourly cost estimate. */
  showHourlyCost: boolean;
  /** Offer only the roles the contract prices (once it prices any). */
  onlyPricedRoles: boolean;
}>;

export function requestPricingGate(
  input: Readonly<{ plansEnabled: boolean; jobLength: JobLengthChoice; rateUnpriced: boolean }>
): RequestPricingGate {
  const longTerm = isLongTermRequest(input.plansEnabled, input.jobLength);
  return {
    longTerm,
    rateUnpriced: longTerm ? false : input.rateUnpriced,
    showHourlyCost: !longTerm,
    onlyPricedRoles: !longTerm
  };
}

/** The pay offer typed in the form, or null when it is missing/invalid. */
export function formPayOffered(fields: PayOfferedFields): PayOffered | null {
  return payOfferedFromForm({ min: fields.payMin, max: fields.payMax, unit: fields.payUnit });
}

/** Extra body fields for POST /api/job-requests: `{}` for short-term, `{ payOffered }` for long-term. */
export function longTermRequestBody(
  plansEnabled: boolean,
  jobLength: JobLengthChoice,
  fields: PayOfferedFields
): Readonly<{ payOffered: Readonly<{ minMinor: number; maxMinor: number | null; unit: string }> }> | Readonly<Record<string, never>> {
  if (!isLongTermRequest(plansEnabled, jobLength)) return {};
  const pay = formPayOffered(fields);
  return pay ? { payOffered: { minMinor: pay.minMinor, maxMinor: pay.maxMinor, unit: pay.unit } } : {};
}
