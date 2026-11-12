import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import type { SmsMessage, SmsSender } from "../mailer/smsSender";
import { HOUR, MIN, NOW, at } from "./brainTestFixtures";
import { createJoblopBrainEffects, type JoblopBrainDomain } from "./joblopEffects";

// Effects against a small Prisma double. The double is wrapped in a guard that THROWS on any model that
// holds or moves money (payments, payouts, receipts, invoices, charges, payroll), so these tests also
// prove the phase-1 effects never touch money.

const MONEY_MODELS = new Set([
  "invoice",
  "employerPaymentAttempt",
  "employerPaymentEvent",
  "employerPaymentAllocation",
  "employerPaymentRefund",
  "employerPaymentMethod",
  "employerInvoiceCheckout",
  "workerPayout",
  "paymentReceipt",
  "lateCancellationCharge",
  "payrollCalculation",
  "payrollPeriod",
  "employerPlanOrder",
  "jobListingOrder"
]);

function moneyGuard<T extends object>(base: T): T {
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && MONEY_MODELS.has(prop)) throw new Error(`money model touched: ${prop}`);
      return Reflect.get(target, prop, receiver);
    }
  });
}

function emailFake(status: "sent" | "error" = "sent") {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = {
    configured: true,
    async send(m) {
      sent.push(m);
      return status === "sent" ? { status: "sent", id: "e" } : { status: "error" };
    }
  };
  return { sender, sent };
}

function smsFake(status: "sent" | "error" | "disabled" = "sent") {
  const sent: SmsMessage[] = [];
  const sender: SmsSender = {
    configured: true,
    enabled: status !== "disabled",
    async send(m) {
      if (status === "disabled") return { status: "skipped", reason: "disabled" };
      sent.push(m);
      return status === "sent" ? { status: "sent", id: "s" } : { status: "error" };
    }
  };
  return { sender, sent };
}

type Tables = Record<string, Record<string, unknown>>;

function prismaDouble(tables: { failures?: Tables; assignments?: Tables; timesheets?: Tables; jobs?: Tables; users?: Tables; escalations?: unknown[] }) {
  const updates: Array<{ model: string; args: unknown }> = [];
  const base = {
    messageDeliveryFailure: {
      findUnique: async ({ where }: { where: { id: string } }) => tables.failures?.[where.id] ?? null,
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push({ model: "messageDeliveryFailure", args });
        return {};
      }
    },
    assignment: { findUnique: async ({ where }: { where: { id: string } }) => tables.assignments?.[where.id] ?? null },
    timesheet: { findUnique: async ({ where }: { where: { id: string } }) => tables.timesheets?.[where.id] ?? null },
    jobRequest: { findUnique: async ({ where }: { where: { id: string } }) => tables.jobs?.[where.id] ?? null },
    user: { findUnique: async ({ where }: { where: { id: string } }) => tables.users?.[where.id] ?? null },
    requestEscalation: { findFirst: async () => tables.escalations?.[0] ?? null },
    jobBonus: { findFirst: async () => null }
  };
  return { prisma: moneyGuard(base) as unknown as PrismaClient, updates };
}

function domainFake(fail = false) {
  const calls: string[] = [];
  const domain: JoblopBrainDomain = {
    async approveJobRequest({ jobRequestId }) {
      calls.push(`approveJobRequest:${jobRequestId}`);
      if (fail) throw Object.assign(new Error("Job request operation was denied."), { code: "RWOS_PRICING_UNAVAILABLE" });
    },
    async approveTimesheet({ timesheetId }) {
      calls.push(`approveTimesheet:${timesheetId}`);
    },
    async requestTimesheetCorrection({ timesheetId, actorUserId }) {
      calls.push(`requestTimesheetCorrection:${timesheetId}:${actorUserId}`);
    }
  };
  return { domain, calls };
}

function effectsWith(prisma: PrismaClient, options: { email?: EmailSender; sms?: SmsSender; actor?: string | null; domain?: JoblopBrainDomain | null } = {}) {
  const email = options.email ?? emailFake().sender;
  return createJoblopBrainEffects({
    prisma,
    emailSender: email,
    rawEmailSender: email,
    smsSender: options.sms,
    rawSmsSender: options.sms,
    actorUserId: options.actor === undefined ? "99999999-9999-4999-8999-999999999999" : options.actor,
    domain: options.domain === undefined ? domainFake().domain : options.domain,
    now: () => NOW
  });
}

const liveAssignment = {
  status: "confirmed",
  confirmedTitle: "Cook",
  confirmedStartAt: at(-15 * MIN),
  confirmedEndAt: at(6 * HOUR),
  timezone: "America/Toronto",
  attendanceRecord: { checkInAt: null },
  workerIdentity: { user: { phone: "+15145550123", primaryLanguage: "en" } }
};

const MONEY_TEXT = /\$|\d+[.,]\d{2}|rate|taux|share|part de joblop|marge|margin/i;

describe("joblop brain effects", () => {
  describe("remindWorkerToCheckIn", () => {
    it("texts the worker once, in their language, with no money in it", async () => {
      const sms = smsFake();
      const { prisma } = prismaDouble({ assignments: { a: liveAssignment } });
      const out = await effectsWith(prisma, { sms: sms.sender }).remindWorkerToCheckIn("a");
      expect(out.status).toBe("done");
      expect(sms.sent).toHaveLength(1);
      expect(sms.sent[0]?.to).toBe("+15145550123");
      expect(sms.sent[0]?.text).toMatch(/check in/i);
      expect(sms.sent[0]?.text).not.toMatch(MONEY_TEXT);
    });

    it("skips when the worker already checked in, the shift ended, or texts are off", async () => {
      const checkedIn = { ...liveAssignment, attendanceRecord: { checkInAt: NOW } };
      const ended = { ...liveAssignment, confirmedEndAt: at(-1 * MIN) };
      const { prisma } = prismaDouble({ assignments: { a: checkedIn, b: ended, c: liveAssignment } });
      expect((await effectsWith(prisma, { sms: smsFake().sender }).remindWorkerToCheckIn("a")).status).toBe("skipped");
      expect((await effectsWith(prisma, { sms: smsFake().sender }).remindWorkerToCheckIn("b")).status).toBe("skipped");
      expect((await effectsWith(prisma, { sms: smsFake("disabled").sender }).remindWorkerToCheckIn("c")).status).toBe("skipped");
      expect((await effectsWith(prisma).remindWorkerToCheckIn("c")).status).toBe("skipped");
    });

    it("never texts a worker whose shift was cancelled (attendance record or job)", async () => {
      const cancelledAttendance = { ...liveAssignment, attendanceRecord: { checkInAt: null, status: "cancelled" } };
      const cancelledJob = { ...liveAssignment, jobRequest: { status: "cancelled" } };
      const sms = smsFake();
      const { prisma } = prismaDouble({ assignments: { a: cancelledAttendance, b: cancelledJob } });
      expect(await effectsWith(prisma, { sms: sms.sender }).remindWorkerToCheckIn("a")).toMatchObject({ status: "skipped", detail: "The shift was cancelled." });
      expect(await effectsWith(prisma, { sms: sms.sender }).remindWorkerToCheckIn("b")).toMatchObject({ status: "skipped", detail: "The shift was cancelled." });
      expect(sms.sent).toHaveLength(0);
    });

    it("a failed text is reported as failed", async () => {
      const { prisma } = prismaDouble({ assignments: { a: liveAssignment } });
      expect((await effectsWith(prisma, { sms: smsFake("error").sender }).remindWorkerToCheckIn("a")).status).toBe("failed");
    });
  });

  describe("remindEmployerToConfirmHours", () => {
    const sheet = {
      status: "employer_review",
      employerReviewStatus: "pending",
      scheduledStartAt: at(-34 * HOUR),
      timezone: "America/Toronto",
      jobRequest: { jobRequestNumber: "JR-5", title: "Cook", createdByUserId: "u1" }
    };
    it("emails the employer (French by default) with no rates or Joblop share", async () => {
      const email = emailFake();
      const { prisma } = prismaDouble({ timesheets: { t: sheet }, users: { u1: { emailNormalized: "boss@example.com", primaryLanguage: null } } });
      const out = await effectsWith(prisma, { email: email.sender }).remindEmployerToConfirmHours("t");
      expect(out.status).toBe("done");
      expect(email.sent[0]?.to).toBe("boss@example.com");
      expect(email.sent[0]?.subject).toContain("JR-5");
      expect(email.sent[0]?.text).toContain("confirmer les heures");
      expect(`${email.sent[0]?.subject} ${email.sent[0]?.text}`).not.toMatch(MONEY_TEXT);
    });

    it("skips once the employer answered", async () => {
      const email = emailFake();
      const { prisma } = prismaDouble({ timesheets: { t: { ...sheet, employerReviewStatus: "confirmed" } } });
      expect((await effectsWith(prisma, { email: email.sender }).remindEmployerToConfirmHours("t")).status).toBe("skipped");
      expect(email.sent).toHaveLength(0);
    });
  });

  describe("resendFailedMessage", () => {
    const row = { id: "f", channel: "email", recipient: "a@example.com", subject: "Hello", body: "Text", retryable: true, resentAt: null };
    it("re-sends once with the plain sender and clears the stored text", async () => {
      const email = emailFake();
      const { prisma, updates } = prismaDouble({ failures: { f: row } });
      const out = await effectsWith(prisma, { email: email.sender }).resendFailedMessage("f");
      expect(out.status).toBe("done");
      expect(email.sent).toEqual([{ to: "a@example.com", subject: "Hello", text: "Text" }]);
      expect(updates[0]?.args).toMatchObject({ data: { body: null } });
    });

    it("never re-sends an unsafe or already re-sent message", async () => {
      const email = emailFake();
      const { prisma } = prismaDouble({ failures: { a: { ...row, retryable: false, body: null }, b: { ...row, resentAt: NOW } } });
      const effects = effectsWith(prisma, { email: email.sender });
      expect((await effects.resendFailedMessage("a")).status).toBe("skipped");
      expect((await effects.resendFailedMessage("b")).status).toBe("skipped");
      expect(email.sent).toHaveLength(0);
    });

    it("re-sends a text through the SMS sender", async () => {
      const sms = smsFake();
      const { prisma } = prismaDouble({ failures: { s: { ...row, channel: "sms", recipient: "+15145550123", subject: null } } });
      expect((await effectsWith(prisma, { sms: sms.sender }).resendFailedMessage("s")).status).toBe("done");
      expect(sms.sent).toEqual([{ to: "+15145550123", text: "Text" }]);
    });
  });

  describe("approveRequest", () => {
    const job = {
      id: "j",
      jobRequestNumber: "JR-4",
      title: "Dishwasher",
      status: "submitted",
      submittedAt: at(-1 * HOUR),
      startAt: at(48 * HOUR),
      endAt: at(56 * HOUR),
      numberOfWorkers: 1,
      description: "Wash dishes.",
      jobLength: "short_term",
      requiredCertificateOther: null,
      residence: { addressLine1: "1 Main St", addressSummary: null, city: "Montreal" }
    };

    it("goes through the staff approval flow exactly once", async () => {
      const { domain, calls } = domainFake();
      const { prisma } = prismaDouble({ jobs: { j: job } });
      const out = await effectsWith(prisma, { domain }).approveRequest("j");
      expect(out.status).toBe("done");
      expect(calls).toEqual(["approveJobRequest:j"]);
    });

    it("re-checks before approving and reports the flow's refusal (pricing, permissions)", async () => {
      const blocked = prismaDouble({ jobs: { j: { ...job, requiredCertificateOther: "Forklift" } } });
      const d1 = domainFake();
      expect((await effectsWith(blocked.prisma, { domain: d1.domain }).approveRequest("j")).status).toBe("skipped");
      expect(d1.calls).toEqual([]);
      const refused = domainFake(true);
      const out = await effectsWith(prismaDouble({ jobs: { j: job } }).prisma, { domain: refused.domain }).approveRequest("j");
      expect(out).toMatchObject({ status: "failed" });
      expect(out.detail).toContain("RWOS_PRICING_UNAVAILABLE");
    });

    it("without the brain staff account it changes nothing", async () => {
      const { domain, calls } = domainFake();
      const out = await effectsWith(prismaDouble({ jobs: { j: job } }).prisma, { domain, actor: null }).approveRequest("j");
      expect(out.status).toBe("skipped");
      expect(calls).toEqual([]);
    });
  });

  describe("approveTimesheet and its undo", () => {
    const sheet = {
      id: "t",
      version: 4,
      status: "platform_review",
      scheduledStartAt: at(-34 * HOUR),
      scheduledEndAt: at(-26 * HOUR),
      workerReviewStatus: "confirmed",
      employerReviewStatus: "confirmed",
      actualCheckInAt: at(-34 * HOUR),
      actualCheckOutAt: at(-26 * HOUR),
      exceptionSummary: null,
      jobRequest: { jobRequestNumber: "JR-5", title: "Cook" },
      attendanceRecord: { exceptionCategory: null }
    };

    it("approves through the staff flow and offers an undo", async () => {
      const { domain, calls } = domainFake();
      const out = await effectsWith(prismaDouble({ timesheets: { t: sheet } }).prisma, { domain }).approveTimesheet("t");
      expect(out).toMatchObject({ status: "done", undo: { kind: "reopen_timesheet", data: { timesheetId: "t" } } });
      expect(calls).toEqual(["approveTimesheet:t"]);
    });

    it("never approves hours with an exception", async () => {
      const { domain, calls } = domainFake();
      const out = await effectsWith(prismaDouble({ timesheets: { t: { ...sheet, attendanceRecord: { exceptionCategory: "late" } } } }).prisma, { domain }).approveTimesheet("t");
      expect(out.status).toBe("skipped");
      expect(calls).toEqual([]);
    });

    it("undo sends approved hours back for correction as the staff member", async () => {
      const { domain, calls } = domainFake();
      const effects = effectsWith(prismaDouble({ timesheets: { t: { ...sheet, status: "approved" } } }).prisma, { domain });
      expect((await effects.reopenTimesheet("t", "staff-7")).ok).toBe(true);
      expect(calls).toEqual(["requestTimesheetCorrection:t:staff-7"]);
      const locked = effectsWith(prismaDouble({ timesheets: { t: { ...sheet, status: "locked" } } }).prisma, { domain });
      expect((await locked.reopenTimesheet("t", "staff-7")).ok).toBe(false);
    });
  });

  it("offerEmployerBonus does nothing without the brain staff account", async () => {
    const out = await effectsWith(prismaDouble({}).prisma, { actor: null }).offerEmployerBonus("j", "why");
    expect(out.status).toBe("skipped");
  });
});
