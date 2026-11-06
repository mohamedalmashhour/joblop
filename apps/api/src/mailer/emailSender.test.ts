import { describe, expect, it } from "vitest";

import { createEmailSender, verificationEmailMessage, type EmailFetch } from "./emailSender";

describe("email sender capsule", () => {
  it("is a no-op that reports skipped when not configured", async () => {
    const noKey = createEmailSender({ apiKey: undefined, from: "ops@example.test" });
    const noFrom = createEmailSender({ apiKey: "xkeysib_key", from: undefined });
    expect(noKey.configured).toBe(false);
    expect(noFrom.configured).toBe(false);
    await expect(
      noKey.send({ to: "worker@example.test", subject: "Hi", text: "Code 123456" })
    ).resolves.toEqual({ status: "skipped", reason: "not_configured" });
  });

  it("posts to Brevo with api-key header and structured sender/to body", async () => {
    let captured: Parameters<EmailFetch> | null = null;
    const sender = createEmailSender({
      apiKey: "xkeysib_secret",
      from: "Joblop <ops@example.test>",
      fetch: async (input, init) => {
        captured = [input, init];
        return { ok: true, status: 201, json: async () => ({ messageId: "brevo-1" }) };
      }
    });
    expect(sender.configured).toBe(true);

    const result = await sender.send({ to: "client@example.test", subject: "Approved", text: "code JR-1" });

    expect(result).toEqual({ status: "sent", id: "brevo-1" });
    const [url, init] = captured!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("xkeysib_secret");
    expect(JSON.parse(init.body)).toMatchObject({
      sender: { email: "ops@example.test", name: "Joblop" },
      to: [{ email: "client@example.test" }],
      subject: "Approved",
      textContent: "code JR-1"
    });
  });

  it("reports error on a non-ok response or a thrown request", async () => {
    const failing = createEmailSender({
      apiKey: "xkeysib_secret",
      from: "ops@example.test",
      fetch: async () => ({ ok: false, status: 422, json: async () => ({}) })
    });
    const throwing = createEmailSender({
      apiKey: "xkeysib_secret",
      from: "ops@example.test",
      fetch: async () => {
        throw new Error("offline");
      }
    });
    await expect(
      failing.send({ to: "worker@example.test", subject: "s", text: "t" })
    ).resolves.toEqual({ status: "error" });
    await expect(
      throwing.send({ to: "worker@example.test", subject: "s", text: "t" })
    ).resolves.toEqual({ status: "error" });
  });

  it("formats a verification-code message with the code and expiry", () => {
    const message = verificationEmailMessage("worker@example.test", "482913", 10);
    expect(message.to).toBe("worker@example.test");
    expect(message.text).toContain("482913");
    expect(message.text).toContain("10 minutes");
    expect(message.subject.toLowerCase()).toContain("verification code");
  });
});
