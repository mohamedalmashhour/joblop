import { describe, expect, it } from "vitest";

import { createSmsSender, toBrevoRecipient, type SmsFetch } from "./smsSender";

describe("sms sender capsule", () => {
  it("is a no-op reporting not_configured when the key or sender is missing", async () => {
    const noKey = createSmsSender({ apiKey: undefined, sender: "JobLop", enabled: true });
    const noSender = createSmsSender({ apiKey: "xkeysib", sender: undefined, enabled: true });
    expect(noKey.configured).toBe(false);
    expect(noSender.configured).toBe(false);
    await expect(noKey.send({ to: "+15145551234", text: "hi" })).resolves.toEqual({
      status: "skipped",
      reason: "not_configured"
    });
  });

  it("MONEY GATE: configured but disabled never calls the paid API and reports skipped/disabled", async () => {
    let called = false;
    const fetchImpl: SmsFetch = async () => {
      called = true;
      return { ok: true, status: 201, async json() { return { messageId: 1 }; } };
    };
    const sender = createSmsSender({ apiKey: "xkeysib", sender: "JobLop", enabled: false, fetch: fetchImpl });
    expect(sender.configured).toBe(true);
    expect(sender.enabled).toBe(false);
    await expect(sender.send({ to: "+15145551234", text: "hi" })).resolves.toEqual({
      status: "skipped",
      reason: "disabled"
    });
    expect(called).toBe(false);
  });

  it("posts to Brevo transactional SMS with api-key header and digits recipient when enabled", async () => {
    let captured: Parameters<SmsFetch> | null = null;
    const fetchImpl: SmsFetch = async (url, init) => {
      captured = [url, init];
      return { ok: true, status: 201, async json() { return { messageId: 42 }; } };
    };
    const sender = createSmsSender({ apiKey: "xkeysib_secret", sender: "JobLop!!", enabled: true, fetch: fetchImpl });
    const result = await sender.send({ to: "+1 (514) 555-1234", text: "Your code is 123456" });
    expect(result).toEqual({ status: "sent", id: "42" });
    expect(captured![0]).toBe("https://api.brevo.com/v3/transactionalSMS/sms");
    expect(captured![1].headers["api-key"]).toBe("xkeysib_secret");
    const body = JSON.parse(captured![1].body) as Record<string, unknown>;
    expect(body.recipient).toBe("15145551234");
    expect(body.sender).toBe("JobLop"); // punctuation stripped, <=11 chars
    expect(body.type).toBe("transactional");
  });

  it("skips when the recipient is not a usable number", async () => {
    const sender = createSmsSender({ apiKey: "xkeysib", sender: "JobLop", enabled: true, fetch: async () => {
      throw new Error("should not be called");
    } });
    await expect(sender.send({ to: "n/a", text: "hi" })).resolves.toEqual({
      status: "skipped",
      reason: "no_recipient"
    });
  });

  it("returns error (not throw) when the provider rejects", async () => {
    const sender = createSmsSender({ apiKey: "xkeysib", sender: "JobLop", enabled: true, fetch: async () => ({
      ok: false,
      status: 401,
      async json() { return { message: "unauthorized" }; }
    }) });
    await expect(sender.send({ to: "+15145551234", text: "hi" })).resolves.toEqual({ status: "error" });
  });

  it("toBrevoRecipient strips the + and separators", () => {
    expect(toBrevoRecipient("+1 (514) 555-1234")).toBe("15145551234");
  });
});
