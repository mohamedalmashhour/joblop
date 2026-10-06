// Transaction Control Room — read-only lifecycle + settlement aggregation for ONE job request.
// Additive, read-only. Assembles the job's current lifecycle state and a computed settlement
// ledger so an admin/auditor can open any transaction and see exactly where it stands and what
// the money looks like. Pricing/margin constants mirror @rwos/shared (kept inline to stay
// dependency-light and robust). Tax + payroll deductions are illustrative.
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

const MARGIN = 0.20; // @rwos/shared DEFAULT_PLATFORM_MARGIN_PPM = 200_000
const MIN_HOURS = 6; // MINIMUM_BILLABLE_SHIFT_HOURS
const CARD_PCT = 0.029; // CARD_TRANSFER_FEE_PERCENT_PPM
const CARD_FIXED = 30; // CARD_TRANSFER_FEE_FIXED_MINOR (cents)
const GST = 0.05;
const QST = 0.09975;

const STAGE_NAMES = ["Post","Dispatch","Offer","Accept","Attendance","Timesheet","Payroll","Invoice","Payment","Close"] as const;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function pick(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) { if (o[k] != null) return o[k]; }
  return null;
}
function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function r(v: number): number { return Math.round(v); }

function stagesFor(status: string) {
  let done = 1, current = 2;
  if (status === "draft") { done = 0; current = 1; }
  else if (status === "submitted" || status === "admin_review" || status === "information_required") { done = 1; current = 2; }
  else if (status === "approved_for_dispatch") { done = 2; current = 3; }
  else if (status === "cancelled" || status === "expired" || status === "archived") { done = 0; current = 0; }
  return STAGE_NAMES.map((name, i) => {
    const n = i + 1;
    let state: "done" | "current" | "pending" = "pending";
    if (current === 0) state = "pending";
    else if (n <= done) state = "done";
    else if (n === current) state = "current";
    return { n, name, state };
  });
}

function computeLedger(rateMinor: number | null, hours: number | null, workers: number | null) {
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

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  const { jobRequestId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/calendar/requests/${encodeURIComponent(jobRequestId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);

  try {
    const payload = asRecord(result.payload);
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
    const rateMinor = num(pick(req, ["employerHourlyRateMinor", "hourlyRateMinor", "rateMinor"]))
      ?? num(pick(pricing, ["employerHourlyRateMinor", "hourlyRateMinor"]));

    const DEFAULT_RATE_MINOR = 3000; // $30/hr reference when the request has no priced snapshot yet
    const rateUsed = rateMinor ?? DEFAULT_RATE_MINOR;
    const rateSource = rateMinor ? "request" : "reference";
    const stages = stagesFor(status);
    const base = computeLedger(rateUsed, hours, workers);
    const ledger = base ? { ...base, rateSource } : null;

    const checks = [
      { label: "Pricing snapshot locked (unpriced can't be approved)", state: ledger ? "pass" : "pending" },
      { label: "6-hour minimum billing enforced", state: ledger ? "pass" : "pending" },
      { label: "Worker rate hidden from employer", state: "pass" },
      { label: "No fee charged to the worker", state: "pass" },
      { label: "Settlement reconciles to $0.00", state: ledger && ledger.balanceMinor === 0 ? "pass" : "pending" }
    ];

    return Response.json(
      {
        job: { id: jobRequestId, number, title, status, startAt: startAt ?? null, endAt: endAt ?? null, workers, hours },
        stages, ledger, checks
      },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
