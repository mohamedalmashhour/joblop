import { describe, expect, it } from "vitest";
import type { EmailMessage } from "../mailer/emailSender";
import { jobCodeEmail, notifyClient, resolveLanguage, workerAcceptedEmail } from "./clientNotifications";

// Minimal fakes — just the two lookups + send the dispatcher uses.
function fakePrisma(job: unknown, user: unknown) {
  return {
    jobRequest: { findUnique: async () => job },
    user: { findUnique: async () => user }
  } as never;
}

describe("client notification copy", () => {
  it("defaults to French (Québec), English only when primaryLanguage is en", () => {
    expect(resolveLanguage(null)).toBe("fr");
    expect(resolveLanguage("fr-CA")).toBe("fr");
    expect(resolveLanguage("en")).toBe("en");
    expect(resolveLanguage("en-CA")).toBe("en");
  });

  it("job-code email carries the code in subject + body (FR)", () => {
    const m = jobCodeEmail({ to: "c@x.com", language: "fr", jobCode: "JR-2026-000123", title: "Infirmière" });
    expect(m.to).toBe("c@x.com");
    expect(m.subject).toContain("JR-2026-000123");
    expect(m.subject).toContain("approuvée");
    expect(m.text).toContain("JR-2026-000123");
    expect(m.text).toContain("Infirmière");
  });

  it("job-code email in English", () => {
    const m = jobCodeEmail({ to: "c@x.com", language: "en", jobCode: "JR-2026-000123", title: "Nurse" });
    expect(m.subject).toContain("approved");
    expect(m.text).toContain("job code is JR-2026-000123");
  });

  it("worker-accepted email names the code (FR + EN)", () => {
    const fr = workerAcceptedEmail({ to: "c@x.com", language: "fr", jobCode: "JR-2026-000123", title: "Infirmière" });
    expect(fr.subject).toContain("accepté");
    expect(fr.text).toContain("JR-2026-000123");
    const en = workerAcceptedEmail({ to: "c@x.com", language: "en", jobCode: "JR-2026-000123", title: "Nurse" });
    expect(en.subject).toContain("a worker accepted");
    expect(en.text).toContain("confirmed");
  });
});

describe("notifyClient dispatcher", () => {
  const job = { jobRequestNumber: "JR-2026-000123", title: "Infirmière", createdByUserId: "u1" };

  it("resolves creator → email + language and sends the right message", async () => {
    let sent: EmailMessage | null = null;
    const sender = { configured: true, async send(m: EmailMessage) { sent = m; return { status: "sent", id: "x" } as const; } };
    const res = await notifyClient(fakePrisma(job, { emailNormalized: "c@x.com", primaryLanguage: "fr-CA" }), sender, {
      jobRequestId: "j1",
      kind: "job_code"
    });
    expect(res).toEqual({ status: "sent", kind: "job_code" });
    expect(sent!.to).toBe("c@x.com");
    expect(sent!.subject).toContain("JR-2026-000123");
    expect(sent!.subject).toContain("approuvée"); // French for fr-CA
  });

  it("skips (no_recipient) when the creator has no email, without throwing", async () => {
    const sender = { configured: true, async send() { return { status: "sent", id: "x" } as const; } };
    const res = await notifyClient(fakePrisma(job, null), sender, { jobRequestId: "j1", kind: "worker_accepted" });
    expect(res).toEqual({ status: "no_recipient", kind: "worker_accepted" });
  });

  it("reports skipped when the mailer is a no-op (unconfigured)", async () => {
    const sender = { configured: false, async send() { return { status: "skipped", reason: "not_configured" } as const; } };
    const res = await notifyClient(fakePrisma(job, { emailNormalized: "c@x.com", primaryLanguage: "en" }), sender, {
      jobRequestId: "j1",
      kind: "job_code"
    });
    expect(res).toEqual({ status: "skipped", kind: "job_code" });
  });
});
