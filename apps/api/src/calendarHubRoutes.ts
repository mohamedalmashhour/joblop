import type { Prisma, PrismaClient } from "@rwos/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { openJobWhere } from "./openJobs";
import { activeBonusByJob, latestBonusByJob } from "./jobBonusRoutes";
import { WORKER_PAY_SELECT, workerPay, type WorkerPay } from "./longTermWorkerPay";
import type { PayOfferedView } from "@rwos/shared";

// CALENDAR HUB. One read per side (worker, employer, staff) that gathers everything dated in a window
// (jobs, shifts, cancellations, pay, invoices, disputes, pay runs) into calendar items, plus a short
// "today" list of what needs attention now. Read-only; it reuses the open-jobs, coverage and bonus
// rules already in the API. Amounts are integer cents.
//   Worker: never the employer rate, never other workers' names.
//   Employer: own organizations only; workers by first name only; never worker pay.
//   Staff (HR or platform admin): everything.

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MAX_WINDOW_DAYS = 93;
const DEFAULT_PAST_DAYS = 7;
const DEFAULT_FUTURE_DAYS = 45;
const TAKE = 500;
const MAX_TODAY = 40;

export type HubBonus = { kind: "hourly" | "transport" | "one_time"; amountMinor: number };
export type HubItem = {
  id: string;
  type: string;
  startAt: string;
  endAt: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  amountMinor: number | null;
  bonus: HubBonus | null;
  placesLeft: number | null;
  placesAsked: number | null;
  placesTaken: number | null;
  jobRequestId: string | null;
  refId: string | null;
  /** Worker side, long-term listing only (employer plans flag): the employer's own pay offer. */
  payOffered?: PayOfferedView | null;
};
export type TodaySeverity = "info" | "attention" | "urgent";
export type TodayItem = {
  type: string;
  title: string;
  detail: string | null;
  severity: TodaySeverity;
  startAt: string | null;
  jobRequestId: string | null;
  refId: string | null;
};
export type HubWindow = { from: Date; to: Date };
type AssignmentStatus = NonNullable<Prisma.AssignmentCreateInput["status"]>;

export type CalendarHubRouteDeps = Readonly<{
  prisma: PrismaClient;
  /** Any signed-in user. Sends the 401 itself and returns null. */
  requireUser(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** HR or platform administrator. Sends the 401/403 itself and returns null. */
  requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** The organizations where the user has an ACTIVE membership. */
  listActiveOrganizationIds(userId: string): Promise<readonly string[]>;
  /** Assignment statuses that hold a place on a job (shared with open-jobs and coverage). */
  placeHoldingStatuses: readonly AssignmentStatus[];
  /** Places still open per job (shared with open-jobs). */
  remainingOpenings(
    prisma: PrismaClient,
    jobs: readonly Readonly<{ id: string; numberOfWorkers: number }>[]
  ): Promise<Map<string, number>>;
  /** Timezone used for the plain-English "today" titles. */
  timezone?: string | undefined;
  now?: () => Date;
}>;

// ── Pure helpers ──

/** from/to from the query: invalid → default (now−7d .. now+45d); to before from → from+45d; at most 93 days. */
export function parseHubWindow(query: unknown, now: Date): HubWindow {
  const q = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const read = (key: string): Date | null => {
    const v = q[key];
    if (typeof v !== "string" || v.trim() === "") return null;
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : new Date(ms);
  };
  const from = read("from") ?? new Date(now.getTime() - DEFAULT_PAST_DAYS * DAY);
  let to = read("to") ?? new Date(from.getTime() + (DEFAULT_PAST_DAYS + DEFAULT_FUTURE_DAYS) * DAY);
  if (to.getTime() <= from.getTime()) to = new Date(from.getTime() + DEFAULT_FUTURE_DAYS * DAY);
  const max = from.getTime() + MAX_WINDOW_DAYS * DAY;
  if (to.getTime() > max) to = new Date(max);
  return { from, to };
}

export const firstName = (name: string | null | undefined): string | null => {
  const word = (name ?? "").trim().split(/\s+/)[0];
  return word ? word : null;
};

export const formatMoney = (minor: number): string => {
  const sign = minor < 0 ? "-" : "";
  return `${sign}$${(Math.abs(minor) / 100).toFixed(2)}`;
};

export function formatBonus(bonus: HubBonus): string {
  if (bonus.kind === "hourly") return `+${formatMoney(bonus.amountMinor)}/h bonus`;
  if (bonus.kind === "transport") return `+${formatMoney(bonus.amountMinor)} transport bonus`;
  return `+${formatMoney(bonus.amountMinor)} bonus`;
}

export function toHubBonus(b: { kind: string; amountMinor: number } | null | undefined): HubBonus | null {
  if (!b) return null;
  if (b.kind !== "hourly" && b.kind !== "transport" && b.kind !== "one_time") return null;
  return { kind: b.kind, amountMinor: b.amountMinor };
}

export type JobCoverage = "open" | "partly_filled" | "full";
export function jobCoverage(placesAsked: number, placesTaken: number): JobCoverage {
  if (placesTaken >= placesAsked) return "full";
  return placesTaken > 0 ? "partly_filled" : "open";
}

const dayKey = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** "today 8:00", "tomorrow 14:30", "Mon 8:00" (in the given timezone). */
export function whenLabel(at: Date, now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const time = `${Number(part("hour"))}:${part("minute")}`;
  const day = dayKey(at, tz);
  if (day === dayKey(now, tz)) return `today ${time}`;
  if (day === dayKey(new Date(now.getTime() + DAY), tz)) return `tomorrow ${time}`;
  if (day === dayKey(new Date(now.getTime() - DAY), tz)) return `yesterday ${time}`;
  const weekday = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(at);
  return `${weekday} ${time}`;
}

const SEVERITY_RANK: Record<TodaySeverity, number> = { urgent: 0, attention: 1, info: 2 };

export function sortToday(items: TodayItem[]): TodayItem[] {
  return [...items]
    .sort((a, b) => {
      const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (s !== 0) return s;
      const ta = a.startAt ? Date.parse(a.startAt) : Number.MAX_SAFE_INTEGER;
      const tb = b.startAt ? Date.parse(b.startAt) : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    })
    .slice(0, MAX_TODAY);
}

const startsWithin = (item: HubItem, now: Date, hours: number) => {
  const t = Date.parse(item.startAt);
  return t >= now.getTime() && t <= now.getTime() + hours * HOUR;
};
const todayFrom = (item: HubItem, title: string, detail: string | null, severity: TodaySeverity, type = item.type): TodayItem => ({
  type,
  title,
  detail,
  severity,
  startAt: item.startAt,
  jobRequestId: item.jobRequestId,
  refId: item.refId
});
const placesWord = (n: number) => (n === 1 ? "1 worker" : `${n} workers`);

export function buildWorkerToday(items: readonly HubItem[], now: Date, tz: string): TodayItem[] {
  const out: TodayItem[] = [];
  for (const item of items) {
    const when = whenLabel(new Date(item.startAt), now, tz);
    if (item.type === "my_shift" && startsWithin(item, now, 48)) {
      const soon = Date.parse(item.startAt) <= now.getTime() + 24 * HOUR;
      out.push(todayFrom(item, `Shift ${when} — ${item.title}${item.subtitle ? `, ${item.subtitle}` : ""}`, item.bonus ? formatBonus(item.bonus) : null, soon ? "attention" : "info"));
    } else if (item.type === "cancelled_shift" && Date.parse(item.startAt) >= now.getTime() - 24 * HOUR) {
      out.push(todayFrom(item, `Shift cancelled — ${item.title}, ${when}`, item.subtitle, "urgent"));
    } else if (item.type === "available_job" && item.bonus && Date.parse(item.startAt) >= now.getTime()) {
      out.push(todayFrom(item, `Bonus job — ${item.title}, ${when}`, `${formatBonus(item.bonus)}${item.subtitle ? ` · ${item.subtitle}` : ""}`, "info", "bonus_job"));
    } else if (item.type === "pay_day" && item.status !== "paid" && item.status !== "held" && startsWithin(item, now, 7 * 24)) {
      out.push(todayFrom(item, `Pay day ${when}${item.amountMinor !== null ? ` — ${formatMoney(item.amountMinor)}` : ""}`, null, "info"));
    } else if (item.type === "pay_day" && item.status === "paid" && Date.parse(item.startAt) >= now.getTime() - 48 * HOUR && Date.parse(item.startAt) <= now.getTime()) {
      out.push(todayFrom(item, `Paid ${when}${item.amountMinor !== null ? ` — ${formatMoney(item.amountMinor)}` : ""}`, null, "info"));
    }
  }
  return sortToday(out);
}

export function buildEmployerToday(items: readonly HubItem[], now: Date, tz: string): TodayItem[] {
  const out: TodayItem[] = [];
  for (const item of items) {
    const when = whenLabel(new Date(item.startAt), now, tz);
    if (item.type === "job" && startsWithin(item, now, 48)) {
      const left = item.placesLeft ?? 0;
      if (left > 0 && (item.status === "open" || item.status === "partly_filled")) {
        const urgent = Date.parse(item.startAt) <= now.getTime() + 24 * HOUR;
        out.push(todayFrom(item, `Still needs ${placesWord(left)} — ${item.title}, ${when}`, item.subtitle ? `Coming: ${item.subtitle}` : "No worker yet", urgent ? "urgent" : "attention", "job_not_filled"));
      } else {
        out.push(todayFrom(item, `Job ${when} — ${item.title}`, item.subtitle ? `Coming: ${item.subtitle}` : null, "info"));
      }
    } else if (item.type === "bonus_offer" && Date.parse(item.startAt) >= now.getTime()) {
      out.push(todayFrom(item, `Bonus offer waiting for your answer — ${item.title}`, `${item.bonus ? formatBonus(item.bonus) : ""}${item.bonus ? " · " : ""}${when}`, "attention"));
    } else if (item.type === "invoice_due") {
      const due = Date.parse(item.startAt);
      if (due < now.getTime()) {
        out.push(todayFrom(item, `Invoice overdue${item.amountMinor !== null ? ` — ${formatMoney(item.amountMinor)}` : ""}`, item.subtitle, "urgent"));
      } else if (due <= now.getTime() + 7 * DAY) {
        out.push(todayFrom(item, `Invoice due ${when}${item.amountMinor !== null ? ` — ${formatMoney(item.amountMinor)}` : ""}`, item.subtitle, "attention"));
      }
    } else if (item.type === "cancelled_job" && startsWithin(item, now, 48)) {
      out.push(todayFrom(item, `Job cancelled — ${item.title}, ${when}`, null, "info"));
    }
  }
  return sortToday(out);
}

const PENDING_CANCELLATION = new Set(["requested", "assignment_cancellation_pending", "failed", "requires_reconciliation"]);

export function buildStaffToday(
  items: readonly HubItem[],
  extras: Readonly<{ openDisputes: readonly HubItem[]; bonusOffersWaiting: readonly HubItem[] }>,
  now: Date,
  tz: string
): TodayItem[] {
  const out: TodayItem[] = [];
  for (const item of items) {
    const when = whenLabel(new Date(item.startAt), now, tz);
    if (item.type === "job" && startsWithin(item, now, 48) && (item.status === "open" || item.status === "partly_filled")) {
      const urgent = Date.parse(item.startAt) <= now.getTime() + 24 * HOUR;
      out.push(todayFrom(item, `Needs ${placesWord(item.placesLeft ?? 0)} — ${item.title}, ${when}`, item.subtitle, urgent ? "urgent" : "attention", "needs_workers"));
    } else if (item.type === "payout" && (item.status === "pending" || item.status === "released") && Date.parse(item.startAt) <= now.getTime() + 48 * HOUR) {
      out.push(todayFrom(item, `Payout due ${when}${item.amountMinor !== null ? ` — ${formatMoney(item.amountMinor)}` : ""}`, item.subtitle, "attention"));
    } else if (item.type === "cancellation" && item.status && PENDING_CANCELLATION.has(item.status)) {
      const urgent = item.status === "failed" || item.status === "requires_reconciliation";
      out.push(todayFrom(item, `Cancellation to handle — ${item.title}, ${when}`, item.subtitle, urgent ? "urgent" : "attention"));
    }
  }
  for (const offer of extras.bonusOffersWaiting) {
    out.push(todayFrom(offer, `Bonus offer waiting for the employer — ${offer.title}, ${whenLabel(new Date(offer.startAt), now, tz)}`, `${offer.bonus ? formatBonus(offer.bonus) : ""}${offer.subtitle ? ` · ${offer.subtitle}` : ""}`, "attention", "bonus_offer"));
  }
  for (const dispute of extras.openDisputes) {
    out.push(todayFrom(dispute, `Open pay dispute — opened ${whenLabel(new Date(dispute.startAt), now, tz)}`, dispute.subtitle, "attention", "dispute"));
  }
  return sortToday(out);
}

// ── Item mapping (pure) ──

type JobRow = Readonly<{
  id: string;
  title: string;
  status: string;
  numberOfWorkers: number;
  startAt: Date;
  endAt: Date;
  roleDefinition: { displayLabel: string } | null;
  residence: { city: string | null; province: string | null } | null;
  organization?: { displayName: string } | null;
}>;

export const roleOf = (job: Pick<JobRow, "title" | "roleDefinition">) => job.roleDefinition?.displayLabel ?? job.title;
export const areaOf = (residence: JobRow["residence"]): string | null => {
  const city = residence?.city ?? null;
  const prov = residence?.province ?? null;
  return city && prov ? `${city}, ${prov}` : prov;
};

export function availableJobItem(
  job: JobRow,
  placesLeft: number,
  workerRateMinor: number | null,
  bonus: HubBonus | null,
  payExtra: WorkerPay["extra"] = {}
): HubItem {
  return {
    id: `available:${job.id}`,
    type: "available_job",
    startAt: job.startAt.toISOString(),
    endAt: job.endAt.toISOString(),
    title: roleOf(job),
    subtitle: areaOf(job.residence),
    status: "open",
    amountMinor: workerRateMinor,
    bonus,
    placesLeft,
    placesAsked: job.numberOfWorkers,
    placesTaken: Math.max(0, job.numberOfWorkers - placesLeft),
    jobRequestId: job.id,
    refId: job.id,
    ...payExtra
  };
}

/** A job as seen by its employer (status = coverage when approved) or by staff (same, plus subtitle with names). */
export function jobItem(job: JobRow, placesTaken: number, subtitle: string | null, amountMinor: number | null, bonus: HubBonus | null): HubItem {
  const placesLeft = Math.max(0, job.numberOfWorkers - placesTaken);
  const cancelled = job.status === "cancelled";
  return {
    id: `${cancelled ? "cancelled_job" : "job"}:${job.id}`,
    type: cancelled ? "cancelled_job" : "job",
    startAt: job.startAt.toISOString(),
    endAt: job.endAt.toISOString(),
    title: roleOf(job),
    subtitle,
    status: cancelled ? "cancelled" : job.status === "approved_for_dispatch" ? jobCoverage(job.numberOfWorkers, placesTaken) : job.status,
    amountMinor,
    bonus,
    placesLeft: cancelled ? null : placesLeft,
    placesAsked: job.numberOfWorkers,
    placesTaken: cancelled ? null : placesTaken,
    jobRequestId: job.id,
    refId: job.id
  };
}

export const isoOrNull = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const inWindow = (d: Date, w: HubWindow) => d.getTime() >= w.from.getTime() && d.getTime() <= w.to.getTime();
const byStart = (a: HubItem, b: HubItem) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id);

/** The date a payout lands on the calendar: when it was paid, else when its hold ends (scheduled). */
export const payoutDate = (p: { paidAt: Date | null; holdUntil: Date }) => p.paidAt ?? p.holdUntil;

const JOB_SELECT = {
  id: true,
  title: true,
  status: true,
  numberOfWorkers: true,
  startAt: true,
  endAt: true,
  roleDefinition: { select: { displayLabel: true } },
  residence: { select: { city: true, province: true } },
  organization: { select: { displayName: true } }
} as const;

const workerNameOf = (w: { displayName: string | null; user: { displayName: string | null } | null } | null) =>
  w?.displayName ?? w?.user?.displayName ?? null;

const SHIFT_CANCELLED_STATUSES = ["worker_withdrawn", "employer_cancelled", "platform_cancelled"] as const;
const UNPAID_INVOICE_STATUSES = ["issued", "sent", "viewed", "partially_paid", "overdue"] as const;
const LIVE_JOB_STATUSES = ["submitted", "admin_review", "information_required", "approved_for_dispatch"] as const;

export function registerCalendarHubRoutes(app: FastifyInstance, deps: CalendarHubRouteDeps) {
  const { prisma } = deps;
  const now = deps.now ?? (() => new Date());
  const tz = deps.timezone ?? "America/Toronto";
  const placeHolding = [...deps.placeHoldingStatuses];
  const send = (reply: FastifyReply, items: HubItem[], today: TodayItem[], w: HubWindow) =>
    reply.code(200).header("cache-control", "no-store").send({ items, today, from: w.from.toISOString(), to: w.to.toISOString() });

  async function takenByJob(jobIds: readonly string[]) {
    if (jobIds.length === 0) return [];
    return prisma.assignment.findMany({
      where: { jobRequestId: { in: [...jobIds] }, status: { in: placeHolding } },
      select: {
        jobRequestId: true,
        workerIdentityId: true,
        workerIdentity: { select: { displayName: true, user: { select: { displayName: true } } } }
      },
      take: TAKE * 4
    });
  }

  // ── Worker ──
  app.get("/worker/calendar-hub", async (request, reply) => {
    const userId = await deps.requireUser(request, reply);
    if (!userId) return;
    const at = now();
    const w = parseHubWindow(request.query, at);
    const identity = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });

    // Available: the same filter as GET /marketplace/open-jobs, upcoming only.
    const openFrom = w.from < at ? at : w.from;
    const openRows =
      openFrom <= w.to
        ? await prisma.jobRequest.findMany({
            where: openJobWhere({ now: at, startFrom: openFrom, startTo: w.to }),
            select: { ...JOB_SELECT, ...WORKER_PAY_SELECT, organization: false, pricingSnapshot: { select: { workerHourlyRateMinor: true } } },
            orderBy: [{ startAt: "asc" }],
            take: TAKE
          })
        : [];

    const shifts = identity
      ? await prisma.assignment.findMany({
          where: { workerIdentityId: identity.id, confirmedStartAt: { gte: w.from, lte: w.to } },
          select: {
            id: true,
            status: true,
            jobRequestId: true,
            confirmedStartAt: true,
            confirmedEndAt: true,
            confirmedTitle: true,
            organization: { select: { displayName: true } },
            jobRequest: { select: { ...JOB_SELECT, ...WORKER_PAY_SELECT, organization: false, pricingSnapshot: { select: { workerHourlyRateMinor: true } } } }
          },
          orderBy: [{ confirmedStartAt: "asc" }],
          take: TAKE
        })
      : [];

    const payouts = identity
      ? await prisma.workerPayout.findMany({
          where: {
            workerIdentityId: identity.id,
            status: { not: "cancelled" },
            OR: [{ holdUntil: { gte: w.from, lte: w.to } }, { paidAt: { gte: w.from, lte: w.to } }]
          },
          select: { id: true, amountMinor: true, status: true, holdUntil: true, paidAt: true },
          orderBy: [{ holdUntil: "asc" }],
          take: TAKE
        })
      : [];

    const left = await deps.remainingOpenings(prisma, openRows);
    const bonus = await activeBonusByJob(prisma, [...openRows.map((r) => r.id), ...shifts.map((s) => s.jobRequestId)]);
    const holding = new Set<string>(deps.placeHoldingStatuses);
    const mine = new Set(shifts.filter((s) => holding.has(s.status) && s.jobRequest.status !== "cancelled").map((s) => s.jobRequestId));

    const items: HubItem[] = [];
    for (const r of openRows) {
      const placesLeft = left.get(r.id) ?? r.numberOfWorkers;
      if (placesLeft <= 0 || mine.has(r.id)) continue;
      // Long-term listing (flag on): no hourly amount, the employer's pay offer instead.
      const pay = workerPay(r, r.pricingSnapshot?.workerHourlyRateMinor ?? null);
      items.push(availableJobItem(r, placesLeft, pay.rateMinor, toHubBonus(bonus.get(r.id)), pay.extra));
    }
    for (const s of shifts) {
      const job = s.jobRequest;
      const cancelled = job.status === "cancelled" || (SHIFT_CANCELLED_STATUSES as readonly string[]).includes(s.status);
      if (!cancelled && !holding.has(s.status)) continue;
      const area = areaOf(job.residence);
      const subtitle = [s.organization?.displayName ?? null, area].filter(Boolean).join(" · ") || null;
      const pay = workerPay(job, job.pricingSnapshot?.workerHourlyRateMinor ?? null);
      items.push({
        id: `${cancelled ? "cancelled" : "shift"}:${s.id}`,
        type: cancelled ? "cancelled_shift" : "my_shift",
        startAt: s.confirmedStartAt.toISOString(),
        endAt: s.confirmedEndAt.toISOString(),
        title: job.roleDefinition?.displayLabel ?? s.confirmedTitle,
        subtitle,
        status: cancelled ? "cancelled" : s.status,
        amountMinor: pay.rateMinor,
        bonus: cancelled ? null : toHubBonus(bonus.get(s.jobRequestId)),
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: s.jobRequestId,
        refId: s.id,
        ...pay.extra
      });
    }
    for (const p of payouts) {
      const date = payoutDate(p);
      if (!inWindow(date, w)) continue;
      items.push({
        id: `pay:${p.id}`,
        type: "pay_day",
        startAt: date.toISOString(),
        endAt: null,
        title: p.status === "paid" ? "Paid" : "Pay day",
        subtitle: null,
        status: p.status,
        amountMinor: p.amountMinor,
        bonus: null,
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: null,
        refId: p.id
      });
    }
    items.sort(byStart);
    return send(reply, items, buildWorkerToday(items, at, tz), w);
  });

  // ── Employer ──
  app.get("/employer/calendar-hub", async (request, reply) => {
    const userId = await deps.requireUser(request, reply);
    if (!userId) return;
    const orgIds = [...new Set(await deps.listActiveOrganizationIds(userId))];
    if (orgIds.length === 0) {
      return reply.code(403).send({ error: "RWOS_CALENDAR_HUB_DENIED", message: "An active company membership is required." });
    }
    const at = now();
    const w = parseHubWindow(request.query, at);

    const jobs = await prisma.jobRequest.findMany({
      where: { organizationId: { in: orgIds }, startAt: { gte: w.from, lte: w.to }, status: { in: [...LIVE_JOB_STATUSES, "cancelled"] } },
      select: { ...JOB_SELECT, pricingSnapshot: { select: { employerHourlyRateMinor: true } } },
      orderBy: [{ startAt: "asc" }],
      take: TAKE
    });
    const live = jobs.filter((j) => j.status !== "cancelled");
    const taken = await takenByJob(live.map((j) => j.id));
    const names = new Map<string, string[]>();
    for (const a of taken) {
      const list = names.get(a.jobRequestId) ?? [];
      list.push(firstName(workerNameOf(a.workerIdentity)) ?? "Worker");
      names.set(a.jobRequestId, list);
    }
    const bonus = await activeBonusByJob(prisma, live.map((j) => j.id));
    const offers = await prisma.jobBonus.findMany({
      where: { organizationId: { in: orgIds }, status: "offered_to_employer", jobRequest: { startAt: { gte: w.from, lte: w.to } } },
      select: { id: true, kind: true, amountMinor: true, jobRequest: { select: JOB_SELECT } },
      orderBy: [{ createdAt: "desc" }],
      take: TAKE
    });
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: { in: orgIds }, status: { in: [...UNPAID_INVOICE_STATUSES] }, dueAt: { gte: w.from, lte: w.to } },
      select: { id: true, invoiceNumber: true, status: true, totalMinor: true, dueAt: true },
      orderBy: [{ dueAt: "asc" }],
      take: TAKE
    });

    const items: HubItem[] = [];
    for (const j of jobs) {
      const who = names.get(j.id) ?? [];
      items.push(
        jobItem(
          j,
          who.length,
          j.status === "cancelled" ? null : who.length > 0 ? who.join(", ") : null,
          j.pricingSnapshot?.employerHourlyRateMinor ?? null,
          j.status === "cancelled" ? null : toHubBonus(bonus.get(j.id))
        )
      );
    }
    for (const o of offers) {
      const hubBonus = toHubBonus(o);
      items.push({
        id: `bonus_offer:${o.id}`,
        type: "bonus_offer",
        startAt: o.jobRequest.startAt.toISOString(),
        endAt: o.jobRequest.endAt.toISOString(),
        title: roleOf(o.jobRequest),
        subtitle: areaOf(o.jobRequest.residence),
        status: "offered_to_employer",
        amountMinor: o.amountMinor,
        bonus: hubBonus,
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: o.jobRequest.id,
        refId: o.id
      });
    }
    for (const inv of invoices) {
      if (!inv.dueAt) continue;
      items.push({
        id: `invoice:${inv.id}`,
        type: "invoice_due",
        startAt: inv.dueAt.toISOString(),
        endAt: null,
        title: "Invoice due",
        subtitle: inv.invoiceNumber ?? null,
        status: inv.status,
        amountMinor: Number(inv.totalMinor),
        bonus: null,
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: null,
        refId: inv.id
      });
    }
    items.sort(byStart);
    return send(reply, items, buildEmployerToday(items, at, tz), w);
  });

  // ── Staff ──
  app.get("/platform/calendar-hub", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const at = now();
    const w = parseHubWindow(request.query, at);

    // Jobs: the same set as GET /platform/calendar/coverage, plus cancelled ones (as cancellations).
    const jobs = await prisma.jobRequest.findMany({
      where: { startAt: { gte: w.from, lte: w.to }, status: { in: [...LIVE_JOB_STATUSES] } },
      select: { ...JOB_SELECT, pricingSnapshot: { select: { workerHourlyRateMinor: true } } },
      orderBy: [{ startAt: "asc" }],
      take: TAKE
    });
    const taken = await takenByJob(jobs.map((j) => j.id));
    const names = new Map<string, string[]>();
    for (const a of taken) {
      const list = names.get(a.jobRequestId) ?? [];
      list.push(workerNameOf(a.workerIdentity) ?? "Worker");
      names.set(a.jobRequestId, list);
    }
    const latest = await latestBonusByJob(prisma, jobs.map((j) => j.id));

    const employerCancellations = await prisma.employerRequestCancellation.findMany({
      where: { jobRequest: { startAt: { gte: w.from, lte: w.to } } },
      select: { id: true, status: true, cause: true, affectedConfirmedWorkers: true, jobRequest: { select: JOB_SELECT } },
      orderBy: [{ initiatedAt: "desc" }],
      take: TAKE
    });
    const workerWithdrawals = await prisma.assignment.findMany({
      where: { status: "worker_withdrawn", confirmedStartAt: { gte: w.from, lte: w.to } },
      select: {
        id: true,
        confirmedStartAt: true,
        confirmedEndAt: true,
        jobRequest: { select: JOB_SELECT },
        workerIdentity: { select: { displayName: true, user: { select: { displayName: true } } } }
      },
      orderBy: [{ confirmedStartAt: "asc" }],
      take: TAKE
    });
    const disputes = await prisma.workerDispute.findMany({
      where: { status: "open" },
      select: { id: true, status: true, category: true, createdAt: true, workerIdentity: { select: { displayName: true, user: { select: { displayName: true } } } } },
      orderBy: [{ createdAt: "asc" }],
      take: TAKE
    });
    const payouts = await prisma.workerPayout.findMany({
      where: { status: { not: "cancelled" }, holdUntil: { gte: w.from, lte: w.to } },
      select: { id: true, amountMinor: true, status: true, holdUntil: true, workerIdentity: { select: { displayName: true, user: { select: { displayName: true } } } } },
      orderBy: [{ holdUntil: "asc" }],
      take: TAKE
    });
    const periods = await prisma.payrollPeriod.findMany({
      where: { periodEnd: { gte: w.from, lte: w.to } },
      select: { id: true, status: true, organizationId: true, periodEnd: true, jurisdictionRegion: true },
      orderBy: [{ periodEnd: "asc" }],
      take: TAKE
    });
    const periodOrgIds = [...new Set(periods.map((p) => p.organizationId))];
    const orgNames = new Map(
      periodOrgIds.length
        ? (
            await prisma.employerOrganization.findMany({ where: { id: { in: periodOrgIds } }, select: { id: true, displayName: true }, take: TAKE })
          ).map((o) => [o.id, o.displayName] as const)
        : []
    );

    const items: HubItem[] = [];
    const bonusOffersWaiting: HubItem[] = [];
    for (const j of jobs) {
      const who = names.get(j.id) ?? [];
      const employer = j.organization?.displayName ?? null;
      const subtitle = [employer, who.length ? who.join(", ") : null].filter(Boolean).join(" · ") || null;
      const b = latest.get(j.id);
      const active = b && (b.status === "employer_accepted" || b.status === "approved") ? toHubBonus(b) : null;
      const item = jobItem(j, who.length, subtitle, j.pricingSnapshot?.workerHourlyRateMinor ?? null, active);
      items.push(item);
      if (b && b.status === "offered_to_employer" && j.startAt.getTime() >= at.getTime()) {
        bonusOffersWaiting.push({ ...item, id: `bonus_offer:${b.id}`, type: "bonus_offer", bonus: toHubBonus(b), refId: b.id, subtitle: employer });
      }
    }
    for (const c of employerCancellations) {
      items.push({
        id: `cancellation:${c.id}`,
        type: "cancellation",
        startAt: c.jobRequest.startAt.toISOString(),
        endAt: c.jobRequest.endAt.toISOString(),
        title: roleOf(c.jobRequest),
        subtitle: [`Cancelled by employer${c.jobRequest.organization?.displayName ? ` (${c.jobRequest.organization.displayName})` : ""}`, c.affectedConfirmedWorkers > 0 ? `${placesWord(c.affectedConfirmedWorkers)} affected` : null]
          .filter(Boolean)
          .join(" · "),
        status: c.status,
        amountMinor: null,
        bonus: null,
        placesLeft: null,
        placesAsked: c.jobRequest.numberOfWorkers,
        placesTaken: null,
        jobRequestId: c.jobRequest.id,
        refId: c.id
      });
    }
    for (const a of workerWithdrawals) {
      items.push({
        id: `cancellation:assignment:${a.id}`,
        type: "cancellation",
        startAt: a.confirmedStartAt.toISOString(),
        endAt: a.confirmedEndAt.toISOString(),
        title: roleOf(a.jobRequest),
        subtitle: `Worker withdrew: ${workerNameOf(a.workerIdentity) ?? "Worker"}${a.jobRequest.organization?.displayName ? ` · ${a.jobRequest.organization.displayName}` : ""}`,
        status: "worker_withdrawn",
        amountMinor: null,
        bonus: null,
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: a.jobRequest.id,
        refId: a.id
      });
    }
    const disputeItems: HubItem[] = disputes.map((d) => ({
      id: `dispute:${d.id}`,
      type: "dispute",
      startAt: d.createdAt.toISOString(),
      endAt: null,
      title: "Pay dispute",
      subtitle: [workerNameOf(d.workerIdentity), d.category].filter(Boolean).join(" · ") || null,
      status: d.status,
      amountMinor: null,
      bonus: null,
      placesLeft: null,
      placesAsked: null,
      placesTaken: null,
      jobRequestId: null,
      refId: d.id
    }));
    items.push(...disputeItems.filter((d) => inWindow(new Date(d.startAt), w)));
    for (const p of payouts) {
      items.push({
        id: `payout:${p.id}`,
        type: "payout",
        startAt: p.holdUntil.toISOString(),
        endAt: null,
        title: "Worker payout",
        subtitle: workerNameOf(p.workerIdentity),
        status: p.status,
        amountMinor: p.amountMinor,
        bonus: null,
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: null,
        refId: p.id
      });
    }
    for (const p of periods) {
      const org = orgNames.get(p.organizationId) ?? null;
      items.push({
        id: `pay_run:${p.id}`,
        type: "pay_run",
        startAt: p.periodEnd.toISOString(),
        endAt: null,
        title: "Pay period ends",
        subtitle: [org, p.jurisdictionRegion].filter(Boolean).join(" · ") || null,
        status: p.status,
        amountMinor: null,
        bonus: null,
        placesLeft: null,
        placesAsked: null,
        placesTaken: null,
        jobRequestId: null,
        refId: p.id
      });
    }
    items.sort(byStart);
    return send(reply, items, buildStaffToday(items, { openDisputes: disputeItems, bonusOffersWaiting }, at, tz), w);
  });
}
