import { describe, expect, it } from "vitest";
import type { EmailMessage } from "../mailer/emailSender";
import { accountPenaltyEmail, assignedJobEmail, notifyWorkerPayoutPaid, notifyWorkerPayoutRegistered, payoutPaidEmail, payoutRegisteredEmail } from "./workerNotifications";

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
