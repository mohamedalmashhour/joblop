// Staff-only extras the API adds to the platform calendar (see apps/api/src/adminRequestSummary.ts):
// company, location and role for each card, and "what the employer asked for" with worker pay and
// margin on the request detail. Parsed defensively: anything malformed becomes null and the page
// simply leaves that block out.

export type RequestCard = Readonly<{
  companyName: string;
  locationName: string | null;
  locationCity: string | null;
  roleLabel: string;
  workGroupLabel: string;
}>;

export type RequestAllowance = Readonly<{
  kind: "transport" | "meal" | "lodging";
  provision: string;
  amountMinor: number | null;
  note: string | null;
}>;

export type RequestPricing = Readonly<{
  source: "approved" | "estimate";
  currency: string;
  marginPpm: number;
  employerHourlyRateMinor: number;
  workerHourlyRateMinor: number;
  platformHourlyMarginMinor: number;
  urgentSurchargePerHourMinor: number;
  allowancesEmployerPerShiftMinor: number;
  allowancesWorkerPerShiftMinor: number;
  distanceSurchargePerShiftMinor: number;
  estimatedTotalMinor: number;
}>;

export type RequestSummary = RequestCard &
  Readonly<{
    urgency: string;
    numberOfWorkers: number;
    hoursPerWorker: number;
    totalHours: number;
    requiredCertificates: readonly string[];
    requiredCertificateOther: string | null;
    allowances: readonly RequestAllowance[];
    pricing: RequestPricing | null;
    pricingProblem: "no_contract" | "no_role_rate" | "unavailable" | null;
    openClaim: boolean;
    confirmedWorkerCount: number;
    publicJobUrl: string | null;
  }>;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function parseCard(input: unknown): RequestCard | null {
  if (!isRec(input)) return null;
  const companyName = str(input.companyName);
  const roleLabel = str(input.roleLabel);
  if (companyName === null || roleLabel === null) return null;
  return {
    companyName,
    locationName: str(input.locationName),
    locationCity: str(input.locationCity),
    roleLabel,
    workGroupLabel: str(input.workGroupLabel) ?? ""
  };
}

export function parseRequestCards(input: unknown): Record<string, RequestCard> {
  if (!isRec(input)) return {};
  const out: Record<string, RequestCard> = {};
  for (const [id, value] of Object.entries(input)) {
    const card = parseCard(value);
    if (card) out[id] = card;
  }
  return out;
}

function parsePricing(input: unknown): RequestPricing | null {
  if (!isRec(input)) return null;
  const keys = [
    "marginPpm",
    "employerHourlyRateMinor",
    "workerHourlyRateMinor",
    "platformHourlyMarginMinor",
    "urgentSurchargePerHourMinor",
    "allowancesEmployerPerShiftMinor",
    "allowancesWorkerPerShiftMinor",
    "distanceSurchargePerShiftMinor",
    "estimatedTotalMinor"
  ] as const;
  const values: Partial<Record<(typeof keys)[number], number>> = {};
  for (const key of keys) {
    const value = num(input[key]);
    if (value === null) return null;
    values[key] = value;
  }
  const currency = str(input.currency);
  if (!currency || (input.source !== "approved" && input.source !== "estimate")) return null;
  return { source: input.source, currency, ...(values as Record<(typeof keys)[number], number>) };
}

export function parseRequestSummary(input: unknown): RequestSummary | null {
  const card = parseCard(input);
  if (!card || !isRec(input)) return null;
  const numberOfWorkers = num(input.numberOfWorkers);
  const hoursPerWorker = num(input.hoursPerWorker);
  const totalHours = num(input.totalHours);
  if (numberOfWorkers === null || hoursPerWorker === null || totalHours === null) return null;
  const allowances = Array.isArray(input.allowances)
    ? input.allowances.flatMap((a): RequestAllowance[] =>
        isRec(a) && (a.kind === "transport" || a.kind === "meal" || a.kind === "lodging") && typeof a.provision === "string"
          ? [{ kind: a.kind, provision: a.provision, amountMinor: num(a.amountMinor), note: str(a.note) }]
          : []
      )
    : [];
  const problem = input.pricingProblem;
  return {
    ...card,
    urgency: str(input.urgency) ?? "normal",
    numberOfWorkers,
    hoursPerWorker,
    totalHours,
    requiredCertificates: Array.isArray(input.requiredCertificates)
      ? input.requiredCertificates.filter((c): c is string => typeof c === "string")
      : [],
    requiredCertificateOther: str(input.requiredCertificateOther),
    allowances,
    pricing: parsePricing(input.pricing),
    pricingProblem:
      problem === "no_contract" || problem === "no_role_rate" || problem === "unavailable" ? problem : null,
    openClaim: input.openClaim === true,
    confirmedWorkerCount: num(input.confirmedWorkerCount) ?? 0,
    publicJobUrl: typeof input.publicJobUrl === "string" && /^https:\/\//.test(input.publicJobUrl) ? input.publicJobUrl : null
  };
}

/** Money in minor units as "$20.00" (fr: "20,00 $"). */
export function formatMoney(minor: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function formatHours(hours: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(hours);
}

/** Intl locale for numbers and money (Arabic keeps Latin digits, like the rest of the console). */
export function intlLocale(locale: string) {
  return locale === "ar" ? "ar-u-nu-latn" : locale;
}
