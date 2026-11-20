import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";

// Staff warnings for approved short-term shifts that are still unfilled close to their start: once
// when under 24 hours remain, and again under 4 hours. It runs inside the existing hourly
// shift-reminder sweep, so no new cron is needed.
//
// Idempotent: one unfilled_shift_alerts row per (job, threshold, start). The row is inserted before
// the email (a concurrent sweep hits the unique key and skips), and an email that failed is retried
// on the next sweep while the shift is still upcoming and unfilled. A rescheduled job warns again for
// its new start. Long-term listings have no shifts and are never warned about.

export const UNFILLED_THRESHOLDS_HOURS = [24, 4] as const;
const HOUR_MS = 3_600_000;

/** The smallest threshold the shift is inside (4 before 24), or null when it starts later. */
export function unfilledThreshold(startAt: Date, now: Date): number | null {
  const hoursLeft = (startAt.getTime() - now.getTime()) / HOUR_MS;
  if (hoursLeft <= 0) return null;
  const inside = UNFILLED_THRESHOLDS_HOURS.filter((h) => hoursLeft <= h);
  return inside.length > 0 ? Math.min(...inside) : null;
}

export type UnfilledShift = Readonly<{
  jobRequestId: string;
  jobRequestNumber: string;
  title: string;
  role: string;
  employer: string;
  city: string | null;
  startAt: Date;
  timezone: string;
  openings: number;
  filled: number;
}>;

type UnfilledPrisma = Pick<PrismaClient, "jobRequest" | "unfilledShiftAlert">;
type Remaining = (jobs: readonly Readonly<{ id: string; numberOfWorkers: number }>[]) => Promise<Map<string, number>>;

/** Approved short-term shifts starting within 24 h that still have open places (staff dashboard). */
export async function listUnfilledShifts(prisma: UnfilledPrisma, remaining: Remaining, now: Date = new Date()): Promise<UnfilledShift[]> {
  const rows = await prisma.jobRequest.findMany({
    where: {
      status: "approved_for_dispatch",
      jobLength: { not: "long_term" },
      startAt: { gt: now, lte: new Date(now.getTime() + UNFILLED_THRESHOLDS_HOURS[0] * HOUR_MS) },
      residence: { status: "active" }
    },
    select: {
      id: true,
      jobRequestNumber: true,
      title: true,
      startAt: true,
      timezone: true,
      numberOfWorkers: true,
      roleDefinition: { select: { displayLabel: true } },
      organization: { select: { displayName: true } },
      residence: { select: { city: true } }
    },
    orderBy: [{ startAt: "asc" }],
    take: 500
  });
  const left = await remaining(rows);
  return rows
    .map((row) => {
      const open = left.get(row.id) ?? row.numberOfWorkers;
      return {
        jobRequestId: row.id,
        jobRequestNumber: row.jobRequestNumber,
        title: row.title,
        role: row.roleDefinition?.displayLabel ?? row.title,
        employer: row.organization.displayName,
        city: row.residence?.city ?? null,
        startAt: row.startAt,
        timezone: row.timezone,
        openings: row.numberOfWorkers,
        filled: row.numberOfWorkers - open
      };
    })
    .filter((shift) => shift.filled < shift.openings);
}

export type UnfilledSweepResult = Readonly<{ unfilled: number; newAlerts: number; emailed: number }>;

export async function runUnfilledShiftSweep(deps: {
  prisma: UnfilledPrisma;
  emailSender: EmailSender;
  remaining: Remaining;
  staffEmail: string | null;
  adminWebOrigin?: string | null;
  now?: () => Date;
}): Promise<UnfilledSweepResult> {
  const now = (deps.now ?? (() => new Date()))();
  const shifts = await listUnfilledShifts(deps.prisma, deps.remaining, now);
  let newAlerts = 0;
  for (const shift of shifts) {
    const threshold = unfilledThreshold(shift.startAt, now);
    if (threshold === null) continue;
    const created = await deps.prisma.unfilledShiftAlert.createMany({
      data: [{ jobRequestId: shift.jobRequestId, thresholdHours: threshold, startAt: shift.startAt, openings: shift.openings, filled: shift.filled }],
      skipDuplicates: true
    });
    newAlerts += created.count;
  }

  // Email every warning not emailed yet whose shift is still upcoming and unfilled (new ones, and
  // ones a failed email left behind).
  const byJob = new Map(shifts.map((shift) => [shift.jobRequestId, shift]));
  const pending = shifts.length === 0
    ? []
    : await deps.prisma.unfilledShiftAlert.findMany({
        where: { emailedAt: null, jobRequestId: { in: [...byJob.keys()] }, startAt: { gt: now } },
        select: { id: true, jobRequestId: true, thresholdHours: true, startAt: true }
      });
  const toSend = pending.filter((alert) => byJob.get(alert.jobRequestId)?.startAt.getTime() === alert.startAt.getTime());
  if (toSend.length === 0 || !deps.staffEmail || !deps.emailSender.configured) {
    return { unfilled: shifts.length, newAlerts, emailed: 0 };
  }
  const lines = toSend
    .map((alert) => ({ alert, shift: byJob.get(alert.jobRequestId)! }))
    .sort((a, b) => a.shift.startAt.getTime() - b.shift.startAt.getTime());
  const result = await deps.emailSender
    .send(unfilledShiftsEmail({ to: deps.staffEmail, items: lines.map(({ alert, shift }) => ({ ...shift, thresholdHours: alert.thresholdHours })), adminWebOrigin: deps.adminWebOrigin ?? null, now }))
    .catch(() => ({ status: "error" }) as const);
  if (result.status !== "sent") return { unfilled: shifts.length, newAlerts, emailed: 0 };
  await deps.prisma.unfilledShiftAlert.updateMany({ where: { id: { in: toSend.map((a) => a.id) }, emailedAt: null }, data: { emailedAt: now } });
  return { unfilled: shifts.length, newAlerts, emailed: toSend.length };
}

// ── Staff email (EN / FR / AR) ─────────────────────────────────────────────────────────────────

function whenIn(date: Date, timezone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

export function unfilledShiftsEmail(input: {
  to: string;
  items: readonly (UnfilledShift & { thresholdHours: number })[];
  adminWebOrigin: string | null;
  now: Date;
}): EmailMessage {
  const count = input.items.length;
  const link = input.adminWebOrigin ? `${input.adminWebOrigin.trim().replace(/\/+$/, "")}/unfilled-shifts` : "Joblop admin → /unfilled-shifts";
  const hoursLeft = (item: UnfilledShift) => Math.max(0, Math.round(((item.startAt.getTime() - input.now.getTime()) / HOUR_MS) * 10) / 10);
  const line = (item: UnfilledShift & { thresholdHours: number }, locale: string, filled: string, left: string) =>
    `- ${item.jobRequestNumber} · ${item.role} · ${item.employer}${item.city ? ` (${item.city})` : ""} · ${whenIn(item.startAt, item.timezone, locale)} · ${filled.replace("{f}", String(item.filled)).replace("{o}", String(item.openings))} · ${left.replace("{h}", String(hoursLeft(item)))}`;
  const en = [
    `${count} approved shift${count === 1 ? " is" : "s are"} still not filled and start${count === 1 ? "s" : ""} soon:`,
    ...input.items.map((i) => line(i, "en-CA", "{f}/{o} filled", "starts in {h} h")),
    "Consider a bonus, contacting workers directly, or telling the employer.",
    `Open the list: ${link}`
  ].join("\n");
  const fr = [
    `${count} quart${count === 1 ? " approuvé n'est" : "s approuvés ne sont"} toujours pas pourvu${count === 1 ? "" : "s"} et commence${count === 1 ? "" : "nt"} bientôt :`,
    ...input.items.map((i) => line(i, "fr-CA", "{f}/{o} pourvus", "commence dans {h} h")),
    "Envisagez une prime, contactez des travailleurs directement ou avisez l'employeur.",
    `Ouvrir la liste : ${link}`
  ].join("\n");
  const ar = [
    `مناوبات معتمدة لم تُشغل بعد وتبدأ قريباً (${count}):`,
    ...input.items.map((i) => line(i, "ar-u-nu-latn", "{f}/{o} مشغولة", "تبدأ خلال {h} ساعة")),
    "فكّر في مكافأة، أو تواصل مع العمال مباشرة، أو أبلغ صاحب العمل.",
    `افتح القائمة: ${link}`
  ].join("\n");
  return {
    to: input.to,
    subject: `Joblop — ${count} unfilled shift${count === 1 ? "" : "s"} starting soon / quart${count === 1 ? "" : "s"} non pourvu${count === 1 ? "" : "s"}`,
    text: `${en}\n\n— — —\n\n${fr}\n\n— — —\n\n${ar}\n\n— Joblop`
  };
}
