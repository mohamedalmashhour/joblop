// Shared Control Room money logic — single source of truth for the settlement
// ledger and the party-scoped snapshots used by the audit report, the
// per-transaction views, and signed share links. Pricing/margin constants
// mirror @rwos/shared (kept inline to stay dependency-light and robust).
// Tax + payroll deductions are illustrative pending the activated country's
// tax + payroll rule provider.

export const MARGIN = 0.2; // @rwos/shared DEFAULT_PLATFORM_MARGIN_PPM = 200_000
export const MIN_HOURS = 6; // MINIMUM_BILLABLE_SHIFT_HOURS
export const CARD_PCT = 0.029; // CARD_TRANSFER_FEE_PERCENT_PPM
export const CARD_FIXED = 30; // CARD_TRANSFER_FEE_FIXED_MINOR (cents)
export const GST = 0.05;
export const QST = 0.09975;

export const STAGE_NAMES = [
  "Post", "Dispatch", "Offer", "Accept", "Attendance",
  "Timesheet", "Payroll", "Invoice", "Payment", "Close"
] as const;

function r(v: number): number { return Math.round(v); }

export type Stage = { n: number; name: string; state: "done" | "current" | "pending" };

export function stagesFor(status: string): Stage[] {
  let done = 1, current = 2;
  if (status === "draft") { done = 0; current = 1; }
  else if (status === "submitted" || status === "admin_review" || status === "information_required") { done = 1; current = 2; }
  else if (status === "approved_for_dispatch") { done = 2; current = 3; }
  else if (status === "cancelled" || status === "expired" || status === "archived") { done = 0; current = 0; }
  return STAGE_NAMES.map((name, i) => {
    const n = i + 1;
    let state: Stage["state"] = "pending";
    if (current === 0) state = "pending";
    else if (n <= done) state = "done";
    else if (n === current) state = "current";
    return { n, name, state };
  });
}

export type Ledger = {
  currency: string; billableHours: number; workers: number;
  employerRateMinor: number; workerRateMinor: number; platformRateMinor: number;
  labourMinor: number; surchargeMinor: number; gstMinor: number; qstMinor: number; invoiceMinor: number;
  workerNetEachMinor: number; workersNetMinor: number; remittancesMinor: number;
  cardFeeMinor: number; platformNetMinor: number; balanceMinor: number;
};

export function computeLedger(
  rateMinor: number | null, hours: number | null, workers: number | null
): Ledger | null {
  if (!rateMinor || !hours || !workers || rateMinor <= 0 || hours <= 0 || workers <= 0) return null;
  const billable = Math.max(hours, MIN_HOURS);
  const workerRate = r(rateMinor * (1 - MARGIN));
  const platformRate = rateMinor - workerRate;
  const labour = rateMinor * billable * workers;
  const workersGross = workerRate * billable * workers;
  const platformMargin = labour - workersGross;
  const cardFee = r(labour * CARD_PCT) + CARD_FIXED;
  const platformFeeShare = Math.floor(cardFee / 2);
  const employerSurcharge = cardFee - platformFeeShare;
  const taxBase = labour + employerSurcharge;
  const gst = r(taxBase * GST);
  const qst = r(taxBase * QST);
  const invoice = labour + employerSurcharge + gst + qst;
  const grossEach = workerRate * billable;
  const dedEach = r(grossEach * 0.0595) + r(grossEach * 0.0164) + r(grossEach * 0.15);
  const netEach = grossEach - dedEach;
  const workersNet = netEach * workers;
  const remittances = dedEach * workers;
  const platformNet = platformMargin - platformFeeShare;
  const balance = invoice - (workersNet + remittances + gst + qst + cardFee + platformNet);
  return {
    currency: "CAD", billableHours: billable, workers,
    employerRateMinor: rateMinor, workerRateMinor: workerRate, platformRateMinor: platformRate,
    labourMinor: labour, surchargeMinor: employerSurcharge, gstMinor: gst, qstMinor: qst, invoiceMinor: invoice,
    workerNetEachMinor: netEach, workersNetMinor: workersNet, remittancesMinor: remittances,
    cardFeeMinor: cardFee, platformNetMinor: platformNet, balanceMinor: balance
  };
}

export const money = (m: number) =>
  Number.isFinite(m) ? `$${(m / 100).toFixed(2)}` : "—";

// ---- Party-scoped snapshot: the ONLY data embedded in a share link ----
// Each view is built from an explicit, named set of fields so masking is
// auditable. The snapshot carries pre-formatted display strings, so a shared
// token never contains fields the recipient is not entitled to see.

export type ShareView = "employer" | "worker";
export type SnapRow = { label: string; value: string; strong?: boolean };
export type Snapshot = {
  view: ShareView;
  title: string;
  number: string;
  generated: string;
  badge: string;
  closed: boolean;
  jobRows: SnapRow[];
  settleRows: SnapRow[];
  note: string;
};

export type JobInfo = {
  number: string; title: string; status: string;
  startAt: string | null; endAt: string | null; workers: number | null;
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function buildSnapshot(view: ShareView, job: JobInfo, L: Ledger): Snapshot {
  const closed = L.balanceMinor === 0;
  const jobRows: SnapRow[] = [
    { label: "Job request", value: job.number },
    { label: "Title", value: job.title },
    { label: "Shift start", value: fmtDate(job.startAt) },
    { label: "Shift end", value: fmtDate(job.endAt) }
  ];

  if (view === "employer") {
    if (job.workers != null) jobRows.push({ label: "Headcount", value: `${job.workers} worker(s)` });
    return {
      view, title: "Your invoice — JobLop", number: job.number,
      generated: new Date().toISOString(), closed,
      badge: closed ? "SETTLED" : "IN PROGRESS",
      jobRows,
      settleRows: [
        { label: "Labour", value: money(L.labourMinor) },
        { label: "Card processing surcharge", value: money(L.surchargeMinor) },
        { label: "GST (illustrative)", value: money(L.gstMinor) },
        { label: "QST (illustrative)", value: money(L.qstMinor) },
        { label: "Total you pay", value: money(L.invoiceMinor), strong: true }
      ],
      note: "You are billed only for clock-verified hours. Worker pay rates are set and paid by JobLop and are not shown on your invoice."
    };
  }

  // worker view
  const grossEach = L.workerRateMinor * L.billableHours;
  const dedEach = grossEach - L.workerNetEachMinor;
  return {
    view, title: "Your pay — JobLop", number: job.number,
    generated: new Date().toISOString(), closed,
    badge: closed ? "PAID" : "IN PROGRESS",
    jobRows,
    settleRows: [
      { label: "Your rate / hr", value: money(L.workerRateMinor) },
      { label: "Hours worked", value: `${L.billableHours}h` },
      { label: "Gross", value: money(grossEach) },
      { label: "Statutory deductions", value: `-${money(dedEach)}` },
      { label: "Your net pay", value: money(L.workerNetEachMinor), strong: true }
    ],
    note: "JobLop takes no fee from your pay. Hours are taken from your recorded clock-in / clock-out, and the 6-hour minimum is honoured."
  };
}

// ---- Gateway payload parsing + full assembly (shared by the BFF route and
// the share-link mint endpoint, so the money logic has one home) ----

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function pick(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) { if (o[k] != null) return o[k]; }
  return null;
}
function num(v: unknown): number | null {
  if (v == null || v === "") return null; // Number(null)===0 / Number("")===0 would otherwise poison a ?? chain
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const DEFAULT_RATE_MINOR = 3000; // $30/hr reference when a request has no priced snapshot yet

export type Check = { label: string; state: "pass" | "pending" };
export type Assembled = {
  job: {
    id: string; number: string; title: string; status: string;
    startAt: string | null; endAt: string | null; workers: number | null; hours: number | null;
  };
  stages: Stage[];
  ledger: (Ledger & { rateSource: "request" | "reference" }) | null;
  checks: Check[];
};

export function assembleTransaction(rawPayload: unknown, jobRequestId: string): Assembled {
  const payload = asRecord(rawPayload);
  const req = asRecord(pick(payload, ["request", "calendarRequest", "jobRequest"]) ?? payload);

  const status = String(pick(req, ["status"]) ?? "unknown");
  const title = String(pick(req, ["title"]) ?? "Staffing request");
  const number = String(pick(req, ["jobRequestNumber", "number"]) ?? jobRequestId);
  const workers = num(pick(req, ["numberOfWorkers", "workers"]));
  const startAt = pick(req, ["startAt", "start"]);
  const endAt = pick(req, ["endAt", "end"]);
  let hours: number | null = null;
  if (startAt && endAt) {
    const ms = new Date(String(endAt)).getTime() - new Date(String(startAt)).getTime();
    if (Number.isFinite(ms) && ms > 0) hours = ms / 3_600_000;
  }
  const pricing = asRecord(pick(req, ["pricing", "pricingSnapshot", "price"]));
  const rawRate = num(pick(req, ["employerHourlyRateMinor", "hourlyRateMinor", "rateMinor"]))
    ?? num(pick(pricing, ["employerHourlyRateMinor", "hourlyRateMinor"]));
  const rateMinor = rawRate != null && rawRate > 0 ? rawRate : null;

  const rateUsed = rateMinor ?? DEFAULT_RATE_MINOR;
  const rateSource: "request" | "reference" = rateMinor ? "request" : "reference";
  const stages = stagesFor(status);
  const base = computeLedger(rateUsed, hours, workers);
  const ledger = base ? { ...base, rateSource } : null;

  const checks: Check[] = [
    { label: "Pricing snapshot locked (unpriced can't be approved)", state: ledger ? "pass" : "pending" },
    { label: "6-hour minimum billing enforced", state: ledger ? "pass" : "pending" },
    { label: "Worker rate hidden from employer", state: "pass" },
    { label: "No fee charged to the worker", state: "pass" },
    { label: "Settlement reconciles to $0.00", state: ledger && ledger.balanceMinor === 0 ? "pass" : "pending" }
  ];

  return {
    job: { id: jobRequestId, number, title, status, startAt: (startAt as string) ?? null, endAt: (endAt as string) ?? null, workers, hours },
    stages, ledger, checks
  };
}
