import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import { payOfferedSentence, type PayOfferedView } from "@rwos/shared";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import { resolveLanguage, type NotificationLanguage } from "./notifications/clientNotifications";
import { leadQueryTokens, queryStoredLeads } from "./jobScannerRepository";

// Job alerts by email. A person (public sign-up, or a signed-in worker) asks Joblop to email them new
// jobs. A bounded sweep sends each live subscription at most one digest per ~20 hours: Joblop's own
// open jobs first, then scanned partner leads, only items that are new since the last digest. Every
// email says who sends it and carries a one-click unsubscribe link (CASL). Unsubscribed rows are never
// emailed. No money, no account change.

export const DIGEST_MIN_INTERVAL_MS = 20 * 3_600_000;
export const FIRST_DIGEST_LOOKBACK_MS = 48 * 3_600_000;
export const DIGEST_MAX_ITEMS = 10;
export const DEFAULT_ALERT_BATCH = 500;
const MAX_ALERT_BATCH = 500;

export function generateUnsubscribeToken(): string {
  return randomBytes(32).toString("base64url");
}

// base64url of 32 bytes is 43 characters; anything else is never a token we issued.
export function isUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function isDigestDue(lastSentAt: Date | null, now: Date): boolean {
  return !lastSentAt || now.getTime() - lastSentAt.getTime() >= DIGEST_MIN_INTERVAL_MS;
}

export function digestSince(lastSentAt: Date | null, now: Date): Date {
  return lastSentAt ?? new Date(now.getTime() - FIRST_DIGEST_LOOKBACK_MS);
}

export function alertLanguage(locale: string | null | undefined, userLanguage: string | null | undefined): NotificationLanguage {
  if (locale === "en" || locale === "fr") return locale;
  return resolveLanguage(userLanguage);
}

// ── Items ───────────────────────────────────────────────────────────────────────────────────────

// A Joblop job that is approved, open to claim and still has places (same rules as GET /marketplace/open-jobs).
export type AlertOpenJob = Readonly<{
  jobRequestId: string;
  role: string;
  title: string;
  city: string | null;
  province: string | null;
  startAt: Date;
  workerRateMinor: number | null;
  // Long-term listing only (employer plans flag): the employer's own pay offer, paid directly.
  payOffered?: PayOfferedView | null;
  // When the job last became visible as open (used to decide what is "new").
  freshAt: Date;
}>;

export type AlertLead = Readonly<{
  id: string;
  title: string;
  employer: string | null;
  city: string | null;
  province: string | null;
  locationLabel: string | null;
  source: string;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryPeriod: "year" | "hour" | null;
  postedAt: Date | null;
  // When Joblop first saw the lead.
  freshAt: Date;
}>;

export type AlertItem = Readonly<{ kind: "job"; job: AlertOpenJob }> | Readonly<{ kind: "lead"; lead: AlertLead }>;

export type AlertCriteria = Readonly<{ roleKeywords: string | null; province: string | null }>;

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function alertKeywordTokens(roleKeywords: string | null | undefined): string[] {
  return leadQueryTokens(roleKeywords ?? undefined).map(fold).filter((token) => token.length > 0);
}

// Keyword match on the job's role, title or city (any word, accents and case ignored); province filter.
export function openJobMatches(job: AlertOpenJob, criteria: AlertCriteria): boolean {
  if (criteria.province && (job.province ?? "").toUpperCase() !== criteria.province.toUpperCase()) return false;
  const tokens = alertKeywordTokens(criteria.roleKeywords);
  if (tokens.length === 0) return true;
  const haystack = fold([job.role, job.title, job.city ?? ""].join(" "));
  return tokens.some((token) => haystack.includes(token));
}

// Up to `limit` newest items, Joblop jobs first, then leads; only items newer than `since`.
export function buildDigestItems(input: {
  jobs: readonly AlertOpenJob[];
  leads: readonly AlertLead[];
  criteria: AlertCriteria;
  since: Date;
  limit?: number;
}): AlertItem[] {
  const limit = input.limit ?? DIGEST_MAX_ITEMS;
  const newestFirst = <T extends { freshAt: Date }>(a: T, b: T) => b.freshAt.getTime() - a.freshAt.getTime();
  const jobs = input.jobs
    .filter((job) => job.freshAt.getTime() > input.since.getTime() && openJobMatches(job, input.criteria))
    .sort(newestFirst)
    .map((job): AlertItem => ({ kind: "job", job }));
  const leads = input.leads
    .filter((lead) => lead.freshAt.getTime() > input.since.getTime())
    .filter((lead) => !input.criteria.province || (lead.province ?? "").toUpperCase() === input.criteria.province.toUpperCase())
    .sort(newestFirst)
    .map((lead): AlertItem => ({ kind: "lead", lead }));
  return [...jobs, ...leads].slice(0, limit);
}

// ── Email copy ──────────────────────────────────────────────────────────────────────────────────

export function sourceLabel(source: string): string {
  switch (source) {
    case "adzuna":
      return "Adzuna";
    case "jobbank":
      return "Job Bank";
    case "talent":
      return "Talent.com";
    default:
      return "Joblop partner";
  }
}

const trimOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

export function unsubscribeUrl(workerWebOrigin: string, token: string): string {
  return `${trimOrigin(workerWebOrigin)}/job-alerts/unsubscribe?token=${encodeURIComponent(token)}`;
}

function money(minor: number, language: NotificationLanguage): string {
  try {
    return new Intl.NumberFormat(language === "en" ? "en-CA" : "fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} $`;
  }
}

function when(date: Date, language: NotificationLanguage, withTime: boolean): string {
  try {
    return new Intl.DateTimeFormat(language === "en" ? "en-CA" : "fr-CA", {
      dateStyle: "medium",
      ...(withTime ? { timeStyle: "short" as const } : {}),
      timeZone: "America/Toronto"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, withTime ? 16 : 10).replace("T", " ");
  }
}

function area(city: string | null, province: string | null, fallback: string | null): string | null {
  if (city && province) return `${city}, ${province}`;
  return fallback ?? province ?? city ?? null;
}

function leadPay(lead: AlertLead, language: NotificationLanguage): string | null {
  const { salaryMinMinor: min, salaryMaxMinor: max, salaryPeriod } = lead;
  if (!min && !max) return null;
  const range = min && max && min !== max ? `${money(min, language)}–${money(max, language)}` : money((min ?? max) as number, language);
  if (salaryPeriod === "hour") return `${range}/h`;
  if (salaryPeriod === "year") return `${range}${language === "en" ? "/year" : "/an"}`;
  return range;
}

function itemLines(item: AlertItem, index: number, language: NotificationLanguage, origin: string): string {
  const en = language === "en";
  if (item.kind === "job") {
    const { job } = item;
    const place = area(job.city, job.province, null);
    const rate = job.payOffered !== undefined
      ? payOfferedSentence(job.payOffered, language)
      : job.workerRateMinor ? `${money(job.workerRateMinor, language)}/h` : null;
    const details = [when(job.startAt, language, true), rate]
      .filter(Boolean)
      .join(" · ");
    return [
      `${index}. ${job.role}${place ? ` — ${place}` : ""}`,
      `   ${details}`,
      en ? `   Joblop job: ${origin}/jobs-calendar` : `   Emploi Joblop : ${origin}/jobs-calendar`
    ].join("\n");
  }
  const { lead } = item;
  const place = area(lead.city, lead.province, lead.locationLabel);
  const pay = leadPay(lead, language);
  const posted = lead.postedAt ? `${en ? "Posted" : "Publié le"} ${when(lead.postedAt, language, false)}` : null;
  const details = [posted, pay].filter(Boolean).join(" · ");
  const head = [lead.title, lead.employer, place].filter(Boolean).join(" — ");
  const link = `${origin}/job-scanner?q=${encodeURIComponent(lead.title)}`;
  return [
    `${index}. ${head}`,
    ...(details ? [`   ${details}`] : []),
    `   ${en ? "Source:" : "Source :"} ${sourceLabel(lead.source)} · ${link}`
  ].join("\n");
}

function describeCriteria(criteria: AlertCriteria, language: NotificationLanguage): string {
  const parts: string[] = [];
  if (criteria.roleKeywords) parts.push(language === "en" ? `"${criteria.roleKeywords}"` : `« ${criteria.roleKeywords} »`);
  if (criteria.province) parts.push(criteria.province);
  if (parts.length === 0) return language === "en" ? "all jobs" : "tous les emplois";
  return parts.join(", ");
}

// CASL: who sends it, why the person gets it, and a working unsubscribe link.
export function alertFooter(input: {
  language: NotificationLanguage;
  to: string;
  workerWebOrigin: string;
  unsubscribeToken: string;
  mailingAddress?: string | null;
}): string {
  const origin = trimOrigin(input.workerWebOrigin);
  const address = input.mailingAddress?.trim();
  const link = unsubscribeUrl(origin, input.unsubscribeToken);
  if (input.language === "en") {
    return (
      `You get this email because you asked Joblop for job alerts at ${input.to}. ` +
      `Sent by Joblop (${origin})${address ? `, ${address}` : ""}.\n` +
      `Unsubscribe in one click: ${link}`
    );
  }
  return (
    `Vous recevez ce courriel parce que vous avez demandé des alertes emploi à Joblop pour ${input.to}. ` +
    `Envoyé par Joblop (${origin})${address ? `, ${address}` : ""}.\n` +
    `Se désabonner en un clic : ${link}`
  );
}

export function jobAlertDigestEmail(input: {
  to: string;
  language: NotificationLanguage;
  items: readonly AlertItem[];
  criteria: AlertCriteria;
  workerWebOrigin: string;
  unsubscribeToken: string;
  mailingAddress?: string | null;
}): EmailMessage {
  const en = input.language === "en";
  const origin = trimOrigin(input.workerWebOrigin);
  const count = input.items.length;
  const list = input.items.map((item, i) => itemLines(item, i + 1, input.language, origin)).join("\n\n");
  const footer = alertFooter({ ...input, workerWebOrigin: origin });
  const what = describeCriteria(input.criteria, input.language);
  if (en) {
    return {
      to: input.to,
      subject: `Joblop — ${count} new job${count === 1 ? "" : "s"} for you`,
      text: `New jobs for you\n\n${count} new job${count === 1 ? "" : "s"} matching your alert (${what}).\n\n${list}\n\n${footer}`
    };
  }
  const jobsFr = count === 1 ? "nouvel emploi" : "nouveaux emplois";
  return {
    to: input.to,
    subject: `Joblop — ${count} ${jobsFr} pour vous`,
    text: `Nouveaux emplois pour vous\n\n${count} ${jobsFr} pour votre alerte (${what}).\n\n${list}\n\n${footer}`
  };
}

export function jobAlertConfirmationEmail(input: {
  to: string;
  language: NotificationLanguage;
  criteria: AlertCriteria;
  workerWebOrigin: string;
  unsubscribeToken: string;
  mailingAddress?: string | null;
}): EmailMessage {
  const what = describeCriteria(input.criteria, input.language);
  const footer = alertFooter(input);
  if (input.language === "en") {
    return {
      to: input.to,
      subject: "Joblop — your job alert is on",
      text: `Your job alert is on\n\nJoblop will email you new jobs for ${what}, at most once a day.\n\n${footer}`
    };
  }
  return {
    to: input.to,
    subject: "Joblop — votre alerte emploi est activée",
    text: `Votre alerte emploi est activée\n\nJoblop vous enverra par courriel les nouveaux emplois pour ${what}, au plus une fois par jour.\n\n${footer}`
  };
}

// ── Subscriptions ───────────────────────────────────────────────────────────────────────────────

// Give the row an unsubscribe token if it has none yet (rows made before tokens existed). Returns it.
export async function ensureUnsubscribeToken(
  prisma: Pick<PrismaClient, "jobAlertSubscription">,
  subscription: Readonly<{ id: string; unsubscribeToken: string | null }>
): Promise<string> {
  if (subscription.unsubscribeToken) return subscription.unsubscribeToken;
  await prisma.jobAlertSubscription.updateMany({
    where: { id: subscription.id, unsubscribeToken: null },
    data: { unsubscribeToken: generateUnsubscribeToken() }
  });
  const row = await prisma.jobAlertSubscription.findUniqueOrThrow({ where: { id: subscription.id }, select: { unsubscribeToken: true } });
  if (!row.unsubscribeToken) throw new Error("RWOS_ALERT_TOKEN_MISSING");
  return row.unsubscribeToken;
}

// Leads newer than nothing in particular — the sweep filters by freshness itself.
export async function loadAlertLeads(prisma: PrismaClient, criteria: AlertCriteria): Promise<AlertLead[]> {
  const stored = await queryStoredLeads(prisma, {
    ...(criteria.province ? { province: criteria.province } : {}),
    ...(criteria.roleKeywords ? { query: criteria.roleKeywords } : {}),
    limit: 100
  });
  if (stored.length === 0) return [];
  const seen = await prisma.externalJobLead.findMany({
    where: { id: { in: stored.map((lead) => lead.id) } },
    select: { id: true, firstSeenAt: true }
  });
  const firstSeen = new Map(seen.map((row) => [row.id, row.firstSeenAt] as const));
  return stored.map((lead) => ({
    id: lead.id,
    title: lead.title,
    employer: lead.employer,
    city: lead.city,
    province: lead.province,
    locationLabel: lead.locationLabel,
    source: lead.source,
    salaryMinMinor: lead.salaryMinMinor,
    salaryMaxMinor: lead.salaryMaxMinor,
    salaryPeriod: lead.salaryPeriod,
    postedAt: lead.postedAt ? new Date(lead.postedAt) : null,
    freshAt: firstSeen.get(lead.id) ?? (lead.postedAt ? new Date(lead.postedAt) : new Date(0))
  }));
}

export type JobAlertSweepResult = Readonly<{ checked: number; sent: number }>;

export async function runJobAlertSweep(deps: {
  prisma: PrismaClient;
  emailSender: EmailSender;
  workerWebOrigin: string | null;
  loadOpenJobs: (now: Date) => Promise<readonly AlertOpenJob[]>;
  loadLeads?: (criteria: AlertCriteria) => Promise<readonly AlertLead[]>;
  mailingAddress?: string | null;
  now?: () => Date;
  batchSize?: number;
}): Promise<JobAlertSweepResult> {
  // Without the worker site there is no working unsubscribe link, so nothing is sent (CASL).
  const origin = deps.workerWebOrigin?.trim() ? trimOrigin(deps.workerWebOrigin) : null;
  if (!origin || !deps.emailSender.configured) return { checked: 0, sent: 0 };
  const now = (deps.now ?? (() => new Date()))();
  const batchSize = Math.min(Math.max(deps.batchSize ?? DEFAULT_ALERT_BATCH, 1), MAX_ALERT_BATCH);
  const dueBefore = new Date(now.getTime() - DIGEST_MIN_INTERVAL_MS);
  const dueWhere = { unsubscribedAt: null, OR: [{ lastSentAt: null }, { lastSentAt: { lte: dueBefore } }] };

  const subscriptions = await deps.prisma.jobAlertSubscription.findMany({
    where: dueWhere,
    select: {
      id: true,
      email: true,
      roleKeywords: true,
      province: true,
      locale: true,
      unsubscribeToken: true,
      lastSentAt: true,
      user: { select: { primaryLanguage: true } }
    },
    // Rows not looked at for longest go first, so a long list is worked through in turn.
    orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    take: batchSize
  });
  if (subscriptions.length === 0) return { checked: 0, sent: 0 };

  const jobs = await deps.loadOpenJobs(now);
  const loadLeads = deps.loadLeads ?? ((criteria: AlertCriteria) => loadAlertLeads(deps.prisma, criteria));
  const leadCache = new Map<string, Promise<readonly AlertLead[]>>();
  const leadsFor = (criteria: AlertCriteria) => {
    const key = `${criteria.province ?? ""}|${(criteria.roleKeywords ?? "").toLowerCase()}`;
    let cached = leadCache.get(key);
    if (!cached) {
      cached = loadLeads(criteria).catch(() => []);
      leadCache.set(key, cached);
    }
    return cached;
  };

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await deps.prisma.jobAlertSubscription.update({ where: { id: subscription.id }, data: { lastCheckedAt: now } });
      const criteria: AlertCriteria = { roleKeywords: subscription.roleKeywords, province: subscription.province };
      const items = buildDigestItems({ jobs, leads: await leadsFor(criteria), criteria, since: digestSince(subscription.lastSentAt, now) });
      if (items.length === 0) continue;
      // Claim the row before sending: still subscribed, still due. A concurrent sweep (or an
      // unsubscribe that just landed) makes this a no-op, so nobody is emailed twice or after leaving.
      const claimed = await deps.prisma.jobAlertSubscription.updateMany({
        where: { id: subscription.id, ...dueWhere },
        data: { lastSentAt: now }
      });
      if (claimed.count === 0) continue;
      const token = await ensureUnsubscribeToken(deps.prisma, subscription);
      const language = alertLanguage(subscription.locale, subscription.user?.primaryLanguage);
      const result = await deps.emailSender
        .send(
          jobAlertDigestEmail({
            to: subscription.email,
            language,
            items,
            criteria,
            workerWebOrigin: origin,
            unsubscribeToken: token,
            mailingAddress: deps.mailingAddress ?? null
          })
        )
        .catch(() => ({ status: "error" }) as const);
      if (result.status === "sent") {
        sent += 1;
      } else {
        // Not delivered: give the row back so the next sweep tries again.
        await deps.prisma.jobAlertSubscription.updateMany({
          where: { id: subscription.id, lastSentAt: now },
          data: { lastSentAt: subscription.lastSentAt }
        });
      }
    } catch {
      // One bad row never stops the sweep.
    }
  }
  return { checked: subscriptions.length, sent };
}
