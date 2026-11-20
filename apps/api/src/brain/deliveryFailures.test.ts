import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import type { EmailSender } from "../mailer/emailSender";
import type { SmsSender } from "../mailer/smsSender";
import { createPrismaDeliveryFailureRecorder, isSafeToResend, withEmailFailureRecording, withSmsFailureRecording, type DeliveryFailureInput } from "./deliveryFailures";

describe("delivery failure recording", () => {
  it("only records real failures, and passes every result through unchanged", async () => {
    const recorded: DeliveryFailureInput[] = [];
    const record = async (f: DeliveryFailureInput) => void recorded.push(f);
    const results = ["sent", "skipped", "error"] as const;
    for (const status of results) {
      const inner: EmailSender = {
        configured: true,
        send: async () => (status === "sent" ? { status, id: "1" } : status === "skipped" ? { status, reason: "not_configured" } : { status })
      };
      const out = await withEmailFailureRecording(inner, record).send({ to: "a@example.com", subject: "S", text: "T" });
      expect(out.status).toBe(status);
    }
    expect(recorded).toEqual([{ channel: "email", recipient: "a@example.com", subject: "S", body: "T", hasAttachments: false }]);
  });

  it("records a thrown send and rethrows it", async () => {
    const recorded: DeliveryFailureInput[] = [];
    const inner: SmsSender = { configured: true, enabled: true, send: async () => { throw new Error("network"); } };
    await expect(withSmsFailureRecording(inner, async (f) => void recorded.push(f)).send({ to: "+1514", text: "Hi" })).rejects.toThrow("network");
    expect(recorded[0]).toMatchObject({ channel: "sms", recipient: "+1514" });
  });

  it("never marks codes, sign-in links or attachments as safe to re-send", () => {
    expect(isSafeToResend({ subject: "Your shift", body: "See you Monday.", hasAttachments: false })).toBe(true);
    expect(isSafeToResend({ subject: null, body: "Your Joblop code is 482913", hasAttachments: false })).toBe(false);
    expect(isSafeToResend({ subject: "Confirm", body: "Open https://joblop.ca/confirm?token=abc", hasAttachments: false })).toBe(false);
    expect(isSafeToResend({ subject: "Invoice", body: "Attached.", hasAttachments: true })).toBe(false);
  });

  it("stores the text only for a safe message, and never throws", async () => {
    const rows: Record<string, unknown>[] = [];
    const prisma = { messageDeliveryFailure: { create: async ({ data }: { data: Record<string, unknown> }) => void rows.push(data) } } as unknown as PrismaClient;
    const record = createPrismaDeliveryFailureRecorder(prisma, () => new Date("2026-11-10T00:00:00Z"));
    await record({ channel: "email", recipient: "a@example.com", subject: "Hi", body: "Plain news", hasAttachments: false });
    await record({ channel: "sms", recipient: "+1514", subject: null, body: "Code 123456", hasAttachments: false });
    expect(rows.map((r) => [r.retryable, r.body])).toEqual([
      [true, "Plain news"],
      [false, null]
    ]);
    const broken = createPrismaDeliveryFailureRecorder({ messageDeliveryFailure: { create: async () => { throw new Error("db"); } } } as unknown as PrismaClient);
    await expect(broken({ channel: "email", recipient: "x", subject: null, body: "y", hasAttachments: false })).resolves.toBeUndefined();
  });
});
