import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import {
  buildDigestItems,
  DIGEST_MIN_INTERVAL_MS,
  digestSince,
  generateUnsubscribeToken,
  isDigestDue,
  isUnsubscribeToken,
  jobAlertConfirmationEmail,
  jobAlertDigestEmail,
  openJobMatches,
  runJobAlertSweep,
  type AlertLead,
  type AlertOpenJob
} from "./jobAlerts";

const HOUR = 3_600_000;
const NOW = new Date("2026-11-08T12:00:00Z");
const ORIGIN = "https://worker.joblop.test";

const job = (over: Partial<AlertOpenJob> = {}): AlertOpenJob => ({
  jobRequestId: "job-1",
  role: "Préposé aux bénéficiaires",
  title: "PAB nuit",
  city: "Laval",
  province: "QC",
  startAt: new Date("2026-11-10T13:00:00Z"),
  workerRateMinor: 2500,
  freshAt: new Date(NOW.getTime() - 2 * HOUR),
  ...over
});

const lead = (over: Partial<AlertLead> = {}): AlertLead => ({
  id: "lead-1",
  title: "Cuisinier",
  employer: "Resto Inc",
  city: "Montréal",
  province: "QC",
  locationLabel: null,
  source: "adzuna",
  salaryMinMinor: 4_000_000,
  salaryMaxMinor: 5_000_000,
  salaryPeriod: "year",
  postedAt: new Date(NOW.getTime() - 5 * HOUR),
  freshAt: new Date(NOW.getTime() - 3 * HOUR),
  ...over
});

describe("job alert matching", () => {
  it("matches keywords on role, title or city, ignoring accents and case, and filters by province", () => {
    expect(openJobMatches(job(), { roleKeywords: "prepose", province: null })).toBe(true);
    expect(openJobMatches(job(), { roleKeywords: "pab", province: null })).toBe(true);
    expect(openJobMatches(job(), { roleKeywords: "laval", province: null })).toBe(true);
    expect(openJobMatches(job(), { roleKeywords: "soudeur", province: null })).toBe(false);
    expect(openJobMatches(job(), { roleKeywords: null, province: "QC" })).toBe(true);
    expect(openJobMatches(job(), { roleKeywords: null, province: "ON" })).toBe(false);
  });

  it("puts Joblop jobs first, keeps only items newer than the last digest, and caps at 10", () => {
    const since = new Date(NOW.getTime() - 4 * HOUR);
    const items = buildDigestItems({
      jobs: [job({ jobRequestId: "old", freshAt: new Date(NOW.getTime() - 10 * HOUR) }), job({ jobRequestId: "new" })],
      leads: [lead({ id: "stale", freshAt: new Date(NOW.getTime() - 9 * HOUR) }), lead(), lead({ id: "on", province: "ON" })],
      criteria: { roleKeywords: null, province: "QC" },
      since
    });
    expect(items.map((i) => (i.kind === "job" ? i.job.jobRequestId : i.lead.id))).toEqual(["new", "lead-1"]);

    const many = buildDigestItems({
      jobs: Array.from({ length: 7 }, (_, i) => job({ jobRequestId: `j${i}`, freshAt: new Date(NOW.getTime() - i * 60_000) })),
      leads: Array.from({ length: 7 }, (_, i) => lead({ id: `l${i}` })),
      criteria: { roleKeywords: null, province: null },
      since
    });
    expect(many).toHaveLength(10);
    expect(many.slice(0, 7).every((i) => i.kind === "job")).toBe(true);
    expect(many[0]?.kind === "job" && many[0].job.jobRequestId).toBe("j0"); // newest first
  });

  it("sends at most one digest per 20 hours, and looks back 48 hours the first time", () => {
    expect(isDigestDue(null, NOW)).toBe(true);
    expect(isDigestDue(new Date(NOW.getTime() - 19 * HOUR), NOW)).toBe(false);
    expect(isDigestDue(new Date(NOW.getTime() - DIGEST_MIN_INTERVAL_MS), NOW)).toBe(true);
    expect(digestSince(null, NOW).getTime()).toBe(NOW.getTime() - 48 * HOUR);
    const last = new Date(NOW.getTime() - 21 * HOUR);
    expect(digestSince(last, NOW)).toBe(last);
  });

  it("issues random base64url unsubscribe tokens of 32 bytes", () => {
    const a = generateUnsubscribeToken();
    expect(isUnsubscribeToken(a)).toBe(true);
    expect(a).not.toBe(generateUnsubscribeToken());
    expect(isUnsubscribeToken("short")).toBe(false);
    expect(isUnsubscribeToken(`${a.slice(0, 42)}!`)).toBe(false);
  });
});

describe("job alert emails", () => {
  const items = buildDigestItems({ jobs: [job()], leads: [lead()], criteria: { roleKeywords: null, province: null }, since: new Date(0) });

  it("the digest lists each item with role, area, date, pay and the worker-site link, labels Adzuna, and carries the CASL footer", () => {
    for (const language of ["fr", "en"] as const) {
      const email = jobAlertDigestEmail({
        to: "pat@example.com", language, items, criteria: { roleKeywords: "cuisinier", province: "QC" },
        workerWebOrigin: `${ORIGIN}/`, unsubscribeToken: "tok_123"
      });
      expect(email.to).toBe("pat@example.com");
      expect(email.subject).toMatch(/^Joblop — 2 /);
      expect(email.text).toContain("Préposé aux bénéficiaires — Laval, QC");
      expect(email.text).toContain(`${ORIGIN}/jobs-calendar`);
      expect(email.text).toContain(`${ORIGIN}/job-scanner?q=Cuisinier`);
      expect(email.text).toMatch(/25\s?\$|\$25/);
      expect(email.text).toMatch(/Source ?: Adzuna/);
      // CASL: who sends it, and a working one-click unsubscribe link.
      expect(email.text).toContain(`${ORIGIN}/job-alerts/unsubscribe?token=tok_123`);
      expect(email.text).toMatch(language === "en" ? /Sent by Joblop/ : /Envoyé par Joblop/);
      expect(email.text).toMatch(language === "en" ? /Unsubscribe/ : /désabonner/);
    }
  });

  it("labels each Adzuna lead, and only Adzuna leads, as Adzuna", () => {
    const mixed = buildDigestItems({
      jobs: [],
      leads: [lead({ id: "a1", title: "Plongeur" }), lead({ id: "a2", title: "Serveur" }), lead({ id: "o1", title: "Caissier", source: "jobbank" })],
      criteria: { roleKeywords: null, province: null },
      since: new Date(0)
    });
    const email = jobAlertDigestEmail({ to: "x@y.z", language: "en", items: mixed, criteria: { roleKeywords: null, province: null }, workerWebOrigin: ORIGIN, unsubscribeToken: "t" });
    expect(email.text.match(/Source: Adzuna/g)).toHaveLength(2);
    expect(email.text).toContain("Source: Job Bank");
  });

  it("the confirmation says who we are and how to unsubscribe, in the chosen language", () => {
    const fr = jobAlertConfirmationEmail({ to: "a@b.c", language: "fr", criteria: { roleKeywords: "cuisinier", province: null }, workerWebOrigin: ORIGIN, unsubscribeToken: "tok" });
    expect(fr.subject).toContain("alerte emploi");
    expect(fr.text).toContain("Envoyé par Joblop");
    expect(fr.text).toContain(`${ORIGIN}/job-alerts/unsubscribe?token=tok`);
    const en = jobAlertConfirmationEmail({ to: "a@b.c", language: "en", criteria: { roleKeywords: null, province: "QC" }, workerWebOrigin: ORIGIN, unsubscribeToken: "tok", mailingAddress: "1 Main St, Montréal QC" });
    expect(en.text).toContain("Sent by Joblop");
    expect(en.text).toContain("1 Main St, Montréal QC");
    expect(en.text).toContain("Unsubscribe in one click");
  });
});

describe("job alert sweep", () => {
  type Sub = {
    id: string; email: string; roleKeywords: string | null; province: string | null; locale: string | null;
    unsubscribeToken: string | null; lastSentAt: Date | null; lastCheckedAt: Date | null; unsubscribedAt: Date | null;
    createdAt: Date; user: { primaryLanguage: string | null } | null;
  };
  const due = (s: Sub, before: Date) => s.unsubscribedAt === null && (s.lastSentAt === null || s.lastSentAt <= before);

  function fakePrisma(subs: Sub[]) {
    const prisma = {
      jobAlertSubscription: {
        findMany: async (args: { where: { OR: [unknown, { lastSentAt: { lte: Date } }] }; take: number }) =>
          subs.filter((s) => due(s, args.where.OR[1].lastSentAt.lte)).slice(0, args.take).map((s) => ({ ...s })),
        update: async ({ where, data }: { where: { id: string }; data: Partial<Sub> }) => Object.assign(subs.find((s) => s.id === where.id)!, data),
        updateMany: async ({ where, data }: { where: { id: string; unsubscribeToken?: null; lastSentAt?: Date; OR?: [unknown, { lastSentAt: { lte: Date } }] }; data: Partial<Sub> }) => {
          const row = subs.find((s) => s.id === where.id);
          if (!row) return { count: 0 };
          if ("unsubscribeToken" in where && row.unsubscribeToken !== null) return { count: 0 };
          if (where.OR && !due(row, where.OR[1].lastSentAt.lte)) return { count: 0 };
          if (where.lastSentAt && row.lastSentAt?.getTime() !== where.lastSentAt.getTime()) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        },
        findUniqueOrThrow: async ({ where }: { where: { id: string } }) => ({ ...subs.find((s) => s.id === where.id)! })
      }
    };
    return prisma as unknown as PrismaClient;
  }
  const sub = (over: Partial<Sub> = {}): Sub => ({
    id: "s1", email: "pat@example.com", roleKeywords: "prepose", province: "QC", locale: null, unsubscribeToken: null,
    lastSentAt: null, lastCheckedAt: null, unsubscribedAt: null, createdAt: new Date(0), user: null, ...over
  });
  const capture = () => {
    const sent: EmailMessage[] = [];
    const sender: EmailSender = { configured: true, send: async (m) => { sent.push(m); return { status: "sent", id: "1" }; } };
    return { sent, sender };
  };

  it("sends one digest, then nothing within 20 h, fills a missing unsubscribe token, never emails an unsubscribed row", async () => {
    const subs = [sub(), sub({ id: "gone", email: "gone@example.com", unsubscribedAt: new Date(0) })];
    const prisma = fakePrisma(subs);
    const { sent, sender } = capture();
    const run = (now: Date) =>
      runJobAlertSweep({ prisma, emailSender: sender, workerWebOrigin: ORIGIN, loadOpenJobs: async () => [job()], loadLeads: async () => [], now: () => now });

    expect(await run(NOW)).toEqual({ checked: 1, sent: 1 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("pat@example.com");
    expect(sent[0]?.subject).toContain("nouvel emploi"); // French by default
    expect(isUnsubscribeToken(subs[0]?.unsubscribeToken)).toBe(true);
    expect(sent[0]?.text).toContain(`/job-alerts/unsubscribe?token=${subs[0]?.unsubscribeToken}`);

    expect(await run(new Date(NOW.getTime() + 2 * HOUR))).toEqual({ checked: 0, sent: 0 });
    // A day later the same job is no longer new: nothing to send.
    expect(await run(new Date(NOW.getTime() + 21 * HOUR))).toEqual({ checked: 1, sent: 0 });
    expect(sent.some((m) => m.to === "gone@example.com")).toBe(false);
  });

  it("sends nothing without a worker-site origin (no working unsubscribe link) or an unconfigured mailer", async () => {
    const { sent, sender } = capture();
    const prisma = fakePrisma([sub()]);
    expect(await runJobAlertSweep({ prisma, emailSender: sender, workerWebOrigin: null, loadOpenJobs: async () => [job()], loadLeads: async () => [], now: () => NOW })).toEqual({ checked: 0, sent: 0 });
    const off: EmailSender = { configured: false, send: async () => ({ status: "skipped", reason: "not_configured" }) };
    expect(await runJobAlertSweep({ prisma, emailSender: off, workerWebOrigin: ORIGIN, loadOpenJobs: async () => [job()], loadLeads: async () => [], now: () => NOW })).toEqual({ checked: 0, sent: 0 });
    expect(sent).toHaveLength(0);
  });

  it("gives the row back when the email fails, so the next sweep retries", async () => {
    const subs = [sub()];
    const failing: EmailSender = { configured: true, send: async () => ({ status: "error" }) };
    expect(await runJobAlertSweep({ prisma: fakePrisma(subs), emailSender: failing, workerWebOrigin: ORIGIN, loadOpenJobs: async () => [job()], loadLeads: async () => [], now: () => NOW })).toEqual({ checked: 1, sent: 0 });
    expect(subs[0]?.lastSentAt).toBeNull();
  });

  it("uses English when the subscriber chose it", async () => {
    const { sent, sender } = capture();
    await runJobAlertSweep({ prisma: fakePrisma([sub({ locale: "en" })]), emailSender: sender, workerWebOrigin: ORIGIN, loadOpenJobs: async () => [job()], loadLeads: async () => [lead({ title: "Préposé" })], now: () => NOW });
    expect(sent[0]?.subject).toBe("Joblop — 2 new jobs for you");
  });
});
