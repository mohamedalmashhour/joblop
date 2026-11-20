import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import type { SmsMessage, SmsSender } from "../mailer/smsSender";
import { createJoblopBrainEffects, type JoblopBrainDomain } from "./joblopEffects";

// "Report my hours" Brain effects with a hand-made database double: the worker notice (email + text,
// once per stage) and the closure after the 12-hour window (missed + one employer email).

const END = new Date("2026-11-12T19:00:00.000Z"); // 14:00 Toronto

function setup(over: { status?: string; reported?: boolean; checkInAt?: Date | null; language?: string } = {}) {
  const markers = new Set<string>();
  const record = {
    status: over.status ?? "pending_start",
    version: 3,
    scheduledStartAt: new Date("2026-11-12T13:00:00.000Z"),
    scheduledEndAt: END,
    timezone: "America/Toronto",
    checkInAt: over.checkInAt ?? null,
    checkOutAt: null,
    assignment: { status: "attendance_handoff" },
    timesheet: null,
    hoursReports: over.reported ? [{ id: "r1" }] : [],
    jobRequest: { status: "approved_for_dispatch", jobRequestNumber: "JR-2026-000007", title: "Farm worker, Laval", createdByUserId: "emp-1", roleDefinition: { displayLabel: "Farm worker" } },
    workerIdentity: { preferredLanguage: null, user: { emailNormalized: "w@x.test", phone: "+15145550123", primaryLanguage: over.language ?? "fr" } }
  };
  const prisma = {
    attendanceRecord: { findUnique: async () => record },
    brainMarker: {
      create: async ({ data }: { data: { marker: string } }) => {
        if (markers.has(data.marker)) throw Object.assign(new Error("unique"), { code: "P2002" });
        markers.add(data.marker);
        return data;
      }
    },
    user: { findUnique: async () => ({ emailNormalized: "boss@farm.test", primaryLanguage: "en" }) }
  } as unknown as PrismaClient;
  const emails: EmailMessage[] = [];
  const texts: SmsMessage[] = [];
  const emailSender: EmailSender = { configured: true, send: async (m) => { emails.push(m); return { status: "sent" } as Awaited<ReturnType<EmailSender["send"]>>; } };
  const smsSender: SmsSender = { configured: true, enabled: true, send: async (m) => { texts.push(m); return { status: "sent", id: "s" }; } };
  const domainCalls: string[] = [];
  const domain = {
    approveJobRequest: async () => undefined,
    approveTimesheet: async () => undefined,
    requestTimesheetCorrection: async () => undefined,
    markAttendanceMissed: async ({ attendanceRecordId, reason }: { attendanceRecordId: string; reason: string }) => { domainCalls.push(`${attendanceRecordId}:${reason}`); }
  } satisfies JoblopBrainDomain;
  let clock = new Date(END.getTime() + 10 * 60_000);
  const effects = createJoblopBrainEffects({
    prisma, emailSender, smsSender, rawEmailSender: emailSender, rawSmsSender: smsSender,
    actorUserId: "brain-staff", domain, now: () => clock, workerWebOrigin: "https://joblop.com/"
  });
  return { effects, emails, texts, domainCalls, setClock: (d: Date) => (clock = d) };
}

describe("report my hours: Brain notice to the worker", () => {
  it("emails and texts the worker once, with the Toronto deadline and a link to the schedule", async () => {
    const { effects, emails, texts } = setup();
    const first = await effects.notifyWorkerToReportHours("att-1", "notice");
    expect(first.status).toBe("done");
    expect(emails).toHaveLength(1);
    expect(emails[0]?.text).toContain("https://joblop.com/schedule");
    expect(emails[0]?.text).toMatch(/13 nov/); // French worker: deadline Nov 13, 02:00 Toronto
    expect(texts).toHaveLength(1);
    expect(texts[0]?.text).toMatch(/^Joblop: /);
    expect((await effects.notifyWorkerToReportHours("att-1", "notice")).status).toBe("skipped");
    expect(emails).toHaveLength(1);
    // The last reminder is a separate stage: sent once too.
    expect((await effects.notifyWorkerToReportHours("att-1", "last")).status).toBe("done");
    expect(emails).toHaveLength(2);
  });

  it("an Arabic reader gets the Arabic email and the French text", async () => {
    const { effects, emails, texts } = setup({ language: "ar" });
    await effects.notifyWorkerToReportHours("att-1", "notice");
    expect(emails[0]?.subject).toMatch(/[؀-ۿ]/);
    expect(texts[0]?.text).not.toMatch(/[؀-ۿ]/);
  });

  it("does nothing once the worker reported, checked in, or the window closed", async () => {
    expect((await setup({ reported: true }).effects.notifyWorkerToReportHours("a", "notice")).status).toBe("skipped");
    expect((await setup({ checkInAt: END }).effects.notifyWorkerToReportHours("a", "notice")).status).toBe("skipped");
    const late = setup();
    late.setClock(new Date(END.getTime() + 12 * 3_600_000 + 60_000));
    expect((await late.effects.notifyWorkerToReportHours("a", "notice")).status).toBe("skipped");
  });
});

describe("report my hours: closing a shift with no hours after 12 h", () => {
  it("marks it missed through the staff step and emails the employer once that it will not be invoiced", async () => {
    const { effects, emails, domainCalls, setClock } = setup();
    expect((await effects.closeUnreportedShift("att-1")).status).toBe("skipped"); // still inside the window
    setClock(new Date(END.getTime() + 12 * 3_600_000 + 60_000));
    const out = await effects.closeUnreportedShift("att-1");
    expect(out).toMatchObject({ status: "done" });
    expect(out.detail).toContain("Not recorded: no hours reported in time");
    expect(domainCalls).toEqual(["att-1:not_recorded_no_hours_reported"]);
    expect(emails.map((m) => m.to)).toEqual(["boss@farm.test"]);
    expect(emails[0]?.text).toContain("will not be invoiced");
    await effects.closeUnreportedShift("att-1");
    expect(emails).toHaveLength(1);
  });
});
