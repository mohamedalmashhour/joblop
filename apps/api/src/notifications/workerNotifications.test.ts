import { describe, expect, it } from "vitest";
import type { EmailMessage } from "../mailer/emailSender";
import { accountPenaltyEmail, notifyWorkerPayoutPaid, payoutPaidEmail } from "./workerNotifications";

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

  it("skips (no_recipient) when the worker has no email, without throwing", async () => {
    const prisma = { workerIdentity: { findUnique: async () => ({ user: null }) } } as never;
    const sender = { configured: true, async send() { return { status: "sent", id: "x" } as const; } };
    const res = await notifyWorkerPayoutPaid(prisma, sender, { workerIdentityId: "wi1", amountMinor: 5000, currency: "CAD" });
    expect(res).toEqual({ status: "no_recipient" });
  });
});
