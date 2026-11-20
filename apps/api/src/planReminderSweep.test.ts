import { describe, expect, it } from "vitest";
import type { EmailMessage } from "./mailer/emailSender";
import type { SmsMessage } from "./mailer/smsSender";
import { createPaymentTestPrisma } from "./paymentTestPrisma";
import { dueReminderStage, planEndingEmail, runPlanReminderSweep } from "./planReminderSweep";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const DAY = 86_400_000;
const ORG = "11111111-1111-4111-8111-111111111111";
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

function setup(overrides: { planEnd?: Date; listingEnd?: Date; planSource?: string; cancelAtPeriodEnd?: boolean; language?: string } = {}) {
  const env = createPaymentTestPrisma({
    organizations: [{ id: ORG, displayName: "Acme", legalName: "Acme Care Inc.", createdByUserId: "owner-1" }],
    users: [{ id: "owner-1", emailNormalized: "owner@acme.test", phone: "+15145550000", primaryLanguage: overrides.language ?? "en" }],
    plans: [
      {
        id: "plan-1", organizationId: ORG, track: "short_term", plan: "shift_pro", status: "active", source: overrides.planSource ?? "purchase",
        currentPeriodEnd: overrides.planEnd ?? at(6), cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
        reminder7SentFor: null, reminder1SentFor: null
      }
    ],
    jobs: [{ id: "job-1", organizationId: ORG, title: "Night caretaker", jobLength: "long_term", status: "approved_for_dispatch" }],
    listings: [
      { id: "listing-1", jobRequestId: "job-1", organizationId: ORG, status: "active", listedUntil: overrides.listingEnd ?? at(20), reminder7SentFor: null, reminder1SentFor: null }
    ]
  });
  const emails: EmailMessage[] = [];
  const texts: SmsMessage[] = [];
  const deps = {
    prisma: env.prisma,
    emailSender: { configured: true, async send(message: EmailMessage) { emails.push(message); return { status: "sent" as const, id: "e" }; } },
    smsSender: { configured: true, enabled: true, async send(message: SmsMessage) { texts.push(message); return { status: "sent" as const, id: "s" }; } }
  };
  return { ...env, emails, texts, run: (now: Date) => runPlanReminderSweep({ ...deps, now: () => now }) };
}

describe("dueReminderStage", () => {
  const none = { reminder7SentFor: null, reminder1SentFor: null };
  it("7-day reminder inside the last week, 1-day reminder inside the last day, nothing else", () => {
    expect(dueReminderStage(at(8), NOW, none)).toBeNull();
    expect(dueReminderStage(at(7), NOW, none)).toBe(7);
    expect(dueReminderStage(at(2), NOW, none)).toBe(7);
    expect(dueReminderStage(at(1), NOW, none)).toBe(1);
    expect(dueReminderStage(at(0.2), NOW, none)).toBe(1);
    expect(dueReminderStage(at(-0.1), NOW, none)).toBeNull();
  });
  it("never repeats a reminder for the same end date; a new end date re-arms both", () => {
    const end = at(3);
    expect(dueReminderStage(end, NOW, { reminder7SentFor: end, reminder1SentFor: null })).toBeNull();
    expect(dueReminderStage(at(0.5), NOW, { reminder7SentFor: at(0.5), reminder1SentFor: null })).toBe(1);
    expect(dueReminderStage(at(0.5), NOW, { reminder7SentFor: null, reminder1SentFor: at(0.5) })).toBeNull();
    expect(dueReminderStage(at(5), NOW, { reminder7SentFor: at(-25), reminder1SentFor: at(-25) })).toBe(7);
  });
});

describe("plan and listing renewal reminders (S3)", () => {
  it("sends the 7-day email once, then the 1-day email with a text, and never twice", async () => {
    const env = setup({ planEnd: at(6) });
    expect(await env.run(NOW)).toMatchObject({ sent7: 1, sent1: 0 });
    expect(env.emails[0]).toMatchObject({ to: "owner@acme.test", subject: expect.stringContaining("Shift Pro plan ends on") });
    expect(env.emails[0]!.text).toContain("Renew 1 month — Interac");
    expect(env.texts).toHaveLength(0);
    // Same day again: nothing new.
    expect(await env.run(new Date(NOW.getTime() + 3_600_000))).toMatchObject({ sent7: 0, sent1: 0 });
    expect(env.emails).toHaveLength(1);
    // The day before the end: the 1-day email and a text.
    expect(await env.run(at(5.5))).toMatchObject({ sent1: 1, texted: 1 });
    expect(env.emails[1]!.subject).toContain("ends tomorrow");
    expect(env.texts[0]!.text).toContain("ends tomorrow");
    expect(await env.run(at(5.6))).toMatchObject({ sent7: 0, sent1: 0 });
    expect(env.emails).toHaveLength(2);
  });

  it("reminds paid listings too, in French by default", async () => {
    const env = setup({ planEnd: at(30), listingEnd: at(4), language: "fr" });
    expect(await env.run(NOW)).toMatchObject({ sent7: 1 });
    expect(env.emails[0]!.subject).toContain("annonce");
    expect(env.emails[0]!.text).toContain("Night caretaker");
  });

  it("a renewal moves the end date and re-arms the reminders", async () => {
    const env = setup({ planEnd: at(6) });
    await env.run(NOW);
    env.tables.plans[0]!.currentPeriodEnd = at(6 + 30);
    expect(await env.run(at(30))).toMatchObject({ sent7: 1 });
    expect(env.emails).toHaveLength(2);
  });

  it("skips trials or granted plans, canceled plans, closed jobs and renewals already sent", async () => {
    expect(await setup({ planSource: "admin_grant" }).run(NOW)).toMatchObject({ scanned: 0 });
    expect(await setup({ cancelAtPeriodEnd: true }).run(NOW)).toMatchObject({ scanned: 0 });
    const closed = setup({ planEnd: at(30), listingEnd: at(3) });
    closed.tables.jobs[0]!.status = "cancelled";
    expect(await closed.run(NOW)).toMatchObject({ scanned: 0 });
    const claimed = setup({ planEnd: at(3) });
    claimed.tables.planOrders.push({ id: "o-1", organizationId: ORG, plan: "shift_pro", status: "payment_claimed", method: "e_transfer" });
    expect(await claimed.run(NOW)).toMatchObject({ sent7: 0, skipped: 1 });
  });

  it("the email says nothing is charged", () => {
    const message = planEndingEmail({ to: "a@b.test", language: "en", subject: { kind: "plan", plan: "shift_business" }, endsAt: at(7), stage: 7 });
    expect(message.text).toContain("No charge is made.");
    expect(message.text).not.toMatch(/margin|share/i);
  });
});
