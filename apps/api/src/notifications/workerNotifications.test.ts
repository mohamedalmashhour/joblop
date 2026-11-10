import { describe, expect, it } from "vitest";
import type { EmailMessage } from "../mailer/emailSender";
import type { SmsMessage } from "../mailer/smsSender";
import {
  accountPenaltyEmail,
  assignedJobEmail,
  describeShiftChange,
  notifyWorkerAssigned,
  notifyWorkerPayoutPaid,
  notifyWorkerPayoutRegistered,
  notifyWorkersShiftCancelled,
  notifyWorkersShiftChanged,
  payoutPaidEmail,
  payoutRegisteredEmail,
  shiftCancelledEmail,
  shiftCancelledSmsText,
  shiftChangedEmail,
  shiftChangedSmsText,
  type ShiftNoticeDetails
} from "./workerNotifications";

describe("worker account penalty copy", () => {
  it("suspension email names the days (FR default + EN)", () => {
    const fr = accountPenaltyEmail({ to: "w@x.com", language: "fr", penalty: "suspend", suspensionDays: 7 });
    expect(fr.subject).toContain("suspendu");
    expect(fr.text).toContain("7 jours");
    const en = accountPenaltyEmail({ to: "w@x.com", language: "en", penalty: "suspend", suspensionDays: 7 });
    expect(en.subject).toContain("suspended");
    expect(en.text).toContain("7 days");
  });
  it("permanent close email", () => {
    const en = accountPenaltyEmail({ to: "w@x.com", language: "en", penalty: "permanent_close", suspensionDays: 0 });
    expect(en.subject).toContain("closed");
  });
});

describe("worker payout notification", () => {
  it("states the amount + currency (FR default, EN when english)", () => {
    const fr = payoutPaidEmail({ to: "w@x.com", language: "fr", amountMinor: 11147, currency: "CAD" });
    expect(fr.subject).toContain("paiement");
    expect(fr.text).toContain("111.47 CAD");
    expect(fr.text).toContain("transféré");
    const en = payoutPaidEmail({ to: "w@x.com", language: "en", amountMinor: 11147, currency: "CAD" });
    expect(en.subject).toContain("payment has been sent");
    expect(en.text).toContain("111.47 CAD");
  });

  it("includes the TEST payment reference when provided, and omits the line when absent", () => {
    const withRef = payoutPaidEmail({ to: "w@x.com", language: "en", amountMinor: 5000, currency: "CAD", reference: "payout-test-synthetic-1" });
    expect(withRef.text).toContain("Reference: payout-test-synthetic-1");
    const frRef = payoutPaidEmail({ to: "w@x.com", language: "fr", amountMinor: 5000, currency: "CAD", reference: "tr_test_123" });
    expect(frRef.text).toContain("Référence : tr_test_123");
    const noRef = payoutPaidEmail({ to: "w@x.com", language: "en", amountMinor: 5000, currency: "CAD" });
    expect(noRef.text).not.toContain("Reference:");
  });

  it("dispatcher resolves identity → user email and sends", async () => {
    let sent: EmailMessage | null = null;
    const prisma = {
      workerIdentity: { findUnique: async () => ({ user: { emailNormalized: "w@x.com", primaryLanguage: "en" } }) }
    } as never;
    const sender = { configured: true, async send(m: EmailMessage) { sent = m; return { status: "sent", id: "x" } as const; } };
    const res = await notifyWorkerPayoutPaid(prisma, sender, { workerIdentityId: "wi1", amountMinor: 5000, currency: "CAD" });
    expect(res).toEqual({ status: "sent" });
    expect(sent!.to).toBe("w@x.com");
    expect(sent!.text).toContain("50.00 CAD");
  });

  it("registered email is distinct from paid — confirms the amount, not a transfer (FR default + EN)", () => {
    const en = payoutRegisteredEmail({ to: "w@x.com", language: "en", amountMinor: 33000, currency: "CAD" });
    expect(en.subject).toContain("confirmed");
    expect(en.text).toContain("registered in your account");
    expect(en.text).not.toContain("transferred to your account"); // not the "paid/sent" notice
    const fr = payoutRegisteredEmail({ to: "w@x.com", language: "fr", amountMinor: 33000, currency: "CAD" });
    expect(fr.subject).toContain("confirmés");
    expect(fr.text).toContain("enregistré dans votre compte");
  });

  it("registered dispatcher resolves identity → user email and sends", async () => {
    let sent: EmailMessage | null = null;
    const prisma = {
      workerIdentity: { findUnique: async () => ({ user: { emailNormalized: "w@x.com", primaryLanguage: "en" } }) }
    } as never;
    const sender = { configured: true, async send(m: EmailMessage) { sent = m; return { status: "sent", id: "x" } as const; } };
    const res = await notifyWorkerPayoutRegistered(prisma, sender, { workerIdentityId: "wi1", amountMinor: 5000, currency: "CAD" });
    expect(res).toEqual({ status: "sent" });
    expect(sent!.text).toContain("registered in your account");
  });

  it("skips (no_recipient) when the worker has no email, without throwing", async () => {
    const prisma = { workerIdentity: { findUnique: async () => ({ user: null }) } } as never;
    const sender = { configured: true, async send() { return { status: "sent", id: "x" } as const; } };
    const res = await notifyWorkerPayoutPaid(prisma, sender, { workerIdentityId: "wi1", amountMinor: 5000, currency: "CAD" });
    expect(res).toEqual({ status: "no_recipient" });
  });
});

describe("assigned job email address", () => {
  const base = { to: "w@example.test", title: "Shift", startAt: new Date("2026-08-10T13:00:00Z") };

  it("gives the assigned worker the exact address in their language", () => {
    expect(assignedJobEmail({ ...base, language: "en", address: "1 Main St" }).text).toContain("Where: 1 Main St");
    expect(assignedJobEmail({ ...base, language: "fr", address: "1 Main St" }).text).toContain("Où : 1 Main St");
  });

  it("omits the line when the worksite has no address on file", () => {
    expect(assignedJobEmail({ ...base, language: "en", address: null }).text).not.toContain("Where:");
  });
});

describe("shift confirmed notice (worker got the job)", () => {
  const job = { title: "Farm help", startAt: new Date("2026-11-12T13:00:00Z"), roleDefinition: null, residence: { addressLine1: "901 Avenue du Parc", city: "Laval", province: "QC" }, calendarProfile: null };
  const prismaFor = (user: Record<string, unknown> | null) =>
    ({ user: { findUnique: async () => user }, jobRequest: { findUnique: async () => job } }) as never;
  const emailSender = (sent: string[]) => ({ configured: true, async send(m: EmailMessage) { sent.push(m.to); return { status: "sent", id: "e" } as const; } });
  const smsSender = (sent: string[]) => ({ configured: true, enabled: true, async send(m: SmsMessage) { sent.push(m.to); return { status: "sent", id: "s" } as const; } });

  it("texts a phone-only worker even with no email on file", async () => {
    const emails: string[] = [];
    const texts: string[] = [];
    const res = await notifyWorkerAssigned(prismaFor({ emailNormalized: null, phone: "+15145550000", primaryLanguage: "fr" }), emailSender(emails), smsSender(texts), { userId: "u1", jobRequestId: "j1" });
    expect(res).toEqual({ status: "sent" });
    expect(texts).toEqual(["+15145550000"]);
    expect(emails).toEqual([]);
  });

  it("sends both the email and the text when both are on file", async () => {
    const emails: string[] = [];
    const texts: string[] = [];
    await notifyWorkerAssigned(prismaFor({ emailNormalized: "w@x.test", phone: "+15145550000", primaryLanguage: "en" }), emailSender(emails), smsSender(texts), { userId: "u1", jobRequestId: "j1" });
    expect(emails).toEqual(["w@x.test"]);
    expect(texts).toEqual(["+15145550000"]);
  });

  it("is no_recipient only when there is neither an email nor a phone", async () => {
    const res = await notifyWorkerAssigned(prismaFor({ emailNormalized: null, phone: null, primaryLanguage: "en" }), emailSender([]), smsSender([]), { userId: "u1", jobRequestId: "j1" });
    expect(res).toEqual({ status: "no_recipient" });
  });
});

describe("shift cancelled / changed notices", () => {
  // 2026-12-03 14:00 UTC = 09:00 in Montréal.
  const shift: ShiftNoticeDetails = {
    role: "Préposé(e)",
    startAt: new Date("2026-12-03T14:00:00Z"),
    endAt: new Date("2026-12-03T22:00:00Z"),
    timeZone: "America/Toronto",
    area: "Laval"
  };

  it("cancelled SMS names role, date-time and area, in English and French", () => {
    const en = shiftCancelledSmsText({ language: "en", shift });
    expect(en).toMatch(/^Joblop: your shift Préposé\(e\) on .*Dec.*3.*2026.* at Laval was cancelled\. Check your calendar\.$/);
    expect(en).toMatch(/9:00/);
    const fr = shiftCancelledSmsText({ language: "fr", shift });
    expect(fr).toMatch(/^Joblop : votre quart Préposé\(e\) le .*déc.* à Laval a été annulé\. Consultez votre calendrier\.$/);
    expect(fr).toMatch(/9 h 00/);
  });

  it("an offer-only cancel says it was the offered shift", () => {
    expect(shiftCancelledSmsText({ language: "en", shift, offerOnly: true })).toContain("the shift you were offered");
    expect(shiftCancelledSmsText({ language: "fr", shift, offerOnly: true })).toContain("qui vous était offert");
  });

  it("cancelled email links the calendar and says to contact Joblop if already on the way", () => {
    const en = shiftCancelledEmail({ to: "w@x.com", language: "en", shift, cancelledBy: "staff", workerWebOrigin: "https://worker.example.test/" });
    expect(en.subject).toContain("cancelled");
    expect(en.text).toContain("https://worker.example.test/jobs-calendar");
    expect(en.text).toContain("If you were already on your way, contact Joblop.");
    expect(en.text).toContain("by Joblop");
    const fr = shiftCancelledEmail({ to: "w@x.com", language: "fr", shift, cancelledBy: "employer", workerWebOrigin: "https://worker.example.test" });
    expect(fr.subject).toContain("annulé");
    expect(fr.text).toContain("https://worker.example.test/jobs-calendar");
    expect(fr.text).toContain("Si vous étiez déjà en route, communiquez avec Joblop.");
    expect(fr.text).toContain("par l'employeur");
  });

  it("never promises cancellation pay", () => {
    for (const language of ["en", "fr"] as const) {
      const plain = shiftCancelledEmail({ to: "w@x.com", language, shift, cancelledBy: "employer" });
      expect(plain.text).not.toMatch(/owed|dues|pay|paie|\$/i);
      expect(shiftCancelledSmsText({ language, shift })).not.toMatch(/owed|dues|pay\b|paie/i);
    }
  });

  it("changed SMS and email carry a short plain summary", () => {
    const summary = { newStartAt: new Date("2026-12-03T14:00:00Z"), newEndAt: new Date("2026-12-03T20:00:00Z") };
    const en = shiftChangedSmsText({ language: "en", shift, summary });
    expect(en).toMatch(/^Joblop: your shift Préposé\(e\) on .* changed: new time 9:00.*–3:00.*\. Open your calendar to see the new details\.$/);
    const fr = shiftChangedSmsText({ language: "fr", shift, summary });
    expect(fr).toMatch(/a changé : nouvel horaire 0?9 h 00–15 h 00\. Ouvrez votre calendrier/);
    const email = shiftChangedEmail({ to: "w@x.com", language: "en", shift, summary: { newPlace: "77 Field Road" }, workerWebOrigin: "https://w.test" });
    expect(email.subject).toContain("changed");
    expect(email.text).toContain("new place 77 Field Road");
    expect(email.text).toContain("https://w.test/jobs-calendar");
  });

  it("describes date, role and settled outcomes", () => {
    const moved = describeShiftChange(
      { newStartAt: new Date("2026-12-04T14:00:00Z"), newEndAt: new Date("2026-12-04T20:00:00Z"), dateChanged: true, newRole: "Cook" },
      "en",
      "America/Toronto"
    );
    expect(moved).toMatch(/^new date .*Dec.*4.*2026, 9:00.*; new role Cook$/);
    expect(describeShiftChange({ outcome: "withdrawn" }, "fr", "America/Toronto")).toContain("vos détails d'origine restent");
    expect(describeShiftChange({ outcome: "final" }, "en", "America/Toronto")).toBe("the change is now final");
  });

  function fakes(phone: string | null) {
    const emails: EmailMessage[] = [];
    const texts: SmsMessage[] = [];
    const prisma = {
      jobRequest: {
        findUnique: async () => ({
          title: "Shift",
          startAt: shift.startAt,
          endAt: shift.endAt,
          timezone: "America/Toronto",
          roleDefinition: { displayLabel: "Cook" },
          residence: { city: "Laval", region: null, province: "QC" }
        })
      },
      user: { findMany: async () => [{ id: "u1", emailNormalized: "w@x.com", phone, primaryLanguage: "en" }] }
    } as never;
    const emailSender = { configured: true, async send(m: EmailMessage) { emails.push(m); return { status: "sent", id: "e" } as const; } };
    const smsSender = { configured: true, enabled: true, async send(m: SmsMessage) { texts.push(m); return { status: "sent", id: "s" } as const; } };
    return { prisma, emailSender, smsSender, emails, texts };
  }

  it("cancel dispatcher texts and emails each worker once", async () => {
    const f = fakes("+15145550000");
    const res = await notifyWorkersShiftCancelled(f.prisma, f.emailSender, f.smsSender, {
      jobRequestId: "j1",
      workers: [{ userId: "u1" }, { userId: "u1" }],
      cancelledBy: "staff",
      workerWebOrigin: "https://w.test"
    });
    expect(res).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(f.emails.map((m) => m.to)).toEqual(["w@x.com"]);
    expect(f.texts).toHaveLength(1);
    expect(f.texts[0]!.to).toBe("+15145550000");
    expect(f.texts[0]!.text).toContain("your shift Cook on");
    expect(f.texts[0]!.text).toContain("at Laval was cancelled");
  });

  it("change dispatcher still emails when the worker has no phone, and never throws", async () => {
    const f = fakes(null);
    const res = await notifyWorkersShiftChanged(f.prisma, f.emailSender, f.smsSender, { jobRequestId: "j1", workers: [{ userId: "u1" }], summary: { newPlace: "Laval" } });
    expect(res.sent).toBe(1);
    expect(f.texts).toHaveLength(0);
    expect(f.emails[0]!.subject).toContain("changed");
    const broken = { jobRequest: { findUnique: async () => { throw new Error("db down"); } }, user: { findMany: async () => [] } } as never;
    await expect(notifyWorkersShiftChanged(broken, f.emailSender, f.smsSender, { jobRequestId: "j1", workers: [{ userId: "u1" }], summary: {} })).resolves.toEqual({ sent: 0, skipped: 0, failed: 1 });
  });
});

describe("worker notices in Arabic (the worker's chosen language)", () => {
  const shift: ShiftNoticeDetails = {
    role: "Cook",
    startAt: new Date("2026-12-03T14:00:00Z"),
    endAt: new Date("2026-12-03T22:00:00Z"),
    timeZone: "America/Toronto",
    area: "Laval"
  };

  it("writes every job notice in Arabic, with Western digits", () => {
    expect(assignedJobEmail({ to: "w@x.com", language: "ar", title: "Cook", startAt: shift.startAt }).subject).toBe("Joblop — حصلت على العمل!");
    expect(shiftCancelledSmsText({ language: "ar", shift })).toMatch(/^Joblop: أُلغيت مناوبتك Cook في .*2026.* في Laval\. راجع تقويمك\.$/);
    expect(shiftCancelledEmail({ to: "w@x.com", language: "ar", shift, cancelledBy: "employer" }).text).toContain("من قِبل صاحب العمل");
    expect(shiftChangedSmsText({ language: "ar", shift, summary: { newPlace: "Laval" } })).toContain("مكان جديد Laval");
    expect(shiftChangedEmail({ to: "w@x.com", language: "ar", shift, summary: {} }).subject).toBe("Joblop — تغيّرت مناوبتك");
    expect(describeShiftChange({ outcome: "final" }, "ar", "America/Toronto")).toBe("أصبح التغيير نهائيًا");
    expect(payoutPaidEmail({ to: "w@x.com", language: "ar", amountMinor: 12_345, currency: "CAD" }).text).toContain("123.45 CAD");
    expect(payoutRegisteredEmail({ to: "w@x.com", language: "ar", amountMinor: 100, currency: "CAD" }).subject).toContain("أرباحك");
    expect(accountPenaltyEmail({ to: "w@x.com", language: "ar", penalty: "suspend", suspensionDays: 7 }).text).toContain("7 أيام");
    expect(shiftCancelledSmsText({ language: "ar", shift })).not.toMatch(/[٠-٩]/);
  });

  it("the dispatcher uses the language stored on the worker's account", async () => {
    const emails: EmailMessage[] = [];
    const texts: SmsMessage[] = [];
    const prisma = {
      jobRequest: {
        findUnique: async () => ({
          title: "Kitchen",
          startAt: shift.startAt,
          endAt: shift.endAt,
          timezone: "America/Toronto",
          roleDefinition: { displayLabel: "Cook" },
          residence: { city: "Laval", region: null, province: "QC" }
        })
      },
      user: { findMany: async () => [{ id: "u1", emailNormalized: "w@x.com", phone: "+15145550000", primaryLanguage: "ar" }] }
    } as never;
    const emailSender = { configured: true, async send(m: EmailMessage) { emails.push(m); return { status: "sent", id: "e" } as const; } };
    const smsSender = { configured: true, enabled: true, async send(m: SmsMessage) { texts.push(m); return { status: "sent", id: "s" } as const; } };
    await notifyWorkersShiftCancelled(prisma, emailSender, smsSender, { jobRequestId: "j1", workers: [{ userId: "u1" }], cancelledBy: "staff" });
    expect(emails[0]!.subject).toBe("Joblop — أُلغيت مناوبتك");
    expect(texts[0]!.text).toContain("أُلغيت مناوبتك Cook");
  });
});
