import { describe, expect, it } from "vitest";

import { runShiftReminderSweep } from "./shiftReminderSweep";
import type { EmailSender } from "./mailer/emailSender";
import type { SmsSender } from "./mailer/smsSender";

function fakeEmail(): { sender: EmailSender; sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    sender: {
      configured: true,
      async send(m) {
        sent.push(m.to);
        return { status: "sent", id: "e1" };
      }
    }
  };
}

function fakeSms(enabled: boolean): { sender: SmsSender; sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    sender: {
      configured: true,
      enabled,
      async send(m) {
        if (!enabled) return { status: "skipped", reason: "disabled" };
        sent.push(m.to);
        return { status: "sent", id: "s1" };
      }
    }
  };
}

// Minimal prisma double for the two calls the sweep makes.
function fakePrisma(rows: Array<Record<string, unknown>>) {
  const marked: string[] = [];
  const prisma = {
    assignment: {
      async findMany() {
        return rows;
      },
      async updateMany(args: { where: { id: string } }) {
        marked.push(args.where.id);
        return { count: 1 };
      }
    }
  };
  return { prisma: prisma as never, marked };
}

const soon = new Date(Date.now() + 2 * 3_600_000);

describe("shift reminder sweep", () => {
  it("emails + SMS due assignments and marks them reminded", async () => {
    const email = fakeEmail();
    const sms = fakeSms(true);
    const { prisma, marked } = fakePrisma([
      {
        id: "a1",
        confirmedTitle: "Night cleaner",
        confirmedStartAt: soon,
        workerIdentity: { user: { emailNormalized: "w@x.test", phone: "+15145551234", primaryLanguage: "en" } }
      }
    ]);
    const metrics = await runShiftReminderSweep({ prisma, emailSender: email.sender, smsSender: sms.sender });
    expect(metrics).toEqual({ scanned: 1, reminded: 1, skipped: 0, failed: 0 });
    expect(email.sent).toEqual(["w@x.test"]);
    expect(sms.sent).toEqual(["+15145551234"]);
    expect(marked).toEqual(["a1"]);
  });

  it("skips a row with no email and no phone and does not mark it", async () => {
    const email = fakeEmail();
    const { prisma, marked } = fakePrisma([
      { id: "a2", confirmedTitle: "x", confirmedStartAt: soon, workerIdentity: { user: null } }
    ]);
    const metrics = await runShiftReminderSweep({ prisma, emailSender: email.sender });
    expect(metrics).toEqual({ scanned: 1, reminded: 0, skipped: 1, failed: 0 });
    expect(marked).toEqual([]);
  });

  it("texts a phone-only worker with no email and marks them reminded", async () => {
    const email = fakeEmail();
    const sms = fakeSms(true);
    const { prisma, marked } = fakePrisma([
      {
        id: "a4",
        confirmedTitle: "Farm help",
        confirmedStartAt: soon,
        workerIdentity: { user: { emailNormalized: null, phone: "+15145559999", primaryLanguage: "fr" } }
      }
    ]);
    const metrics = await runShiftReminderSweep({ prisma, emailSender: email.sender, smsSender: sms.sender });
    expect(metrics).toEqual({ scanned: 1, reminded: 1, skipped: 0, failed: 0 });
    expect(email.sent).toEqual([]);
    expect(sms.sent).toEqual(["+15145559999"]);
    expect(marked).toEqual(["a4"]);
  });

  it("reminds booked shifts in attendance_handoff (every claimed shift), never cancelled ones, with the job-page link", async () => {
    const texts: string[] = [];
    const emails: string[] = [];
    let where: Record<string, unknown> = {};
    const prisma = {
      assignment: {
        async findMany(args: { where: Record<string, unknown> }) {
          where = args.where;
          return [
            {
              id: "a5",
              jobRequestId: "job-1",
              confirmedTitle: "Farm worker",
              confirmedStartAt: soon,
              workerIdentity: { userId: "u5", user: { emailNormalized: "w@x.test", phone: "+15145550000", primaryLanguage: "en" } }
            }
          ];
        },
        async updateMany() {
          return { count: 1 };
        }
      }
    } as never;
    await runShiftReminderSweep({
      prisma,
      emailSender: { configured: true, send: async (m) => (emails.push(m.text), { status: "sent", id: "e" }) },
      smsSender: { configured: true, enabled: true, send: async (m) => (texts.push(m.text), { status: "sent", id: "s" }) },
      workerWebOrigin: "https://work.example.test/"
    });
    expect((where.status as { in: string[] }).in).toContain("attendance_handoff");
    expect(where).toMatchObject({ NOT: { attendanceRecord: { is: { status: "cancelled" } } }, jobRequest: { status: { not: "cancelled" } } });
    expect(texts[0]).toContain("https://work.example.test/jobs/job-1");
    expect(emails[0]).toContain("See the job details and the map: https://work.example.test/jobs/job-1");
  });

  it("does not send SMS when the sender is disabled (money gate)", async () => {
    const email = fakeEmail();
    const sms = fakeSms(false);
    const { prisma } = fakePrisma([
      {
        id: "a3",
        confirmedTitle: "x",
        confirmedStartAt: soon,
        workerIdentity: { user: { emailNormalized: "w@x.test", phone: "+15145551234", primaryLanguage: "fr" } }
      }
    ]);
    const metrics = await runShiftReminderSweep({ prisma, emailSender: email.sender, smsSender: sms.sender });
    expect(metrics.reminded).toBe(1);
    expect(sms.sent).toEqual([]);
  });
});
