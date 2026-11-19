import { describe, expect, it, vi } from "vitest";
import { createTwilioVerify } from "./twilioVerify";
import { createSmsSender } from "./smsSender";

const res = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body });

describe("Twilio Verify capsule", () => {
  it("is a no-op until all three settings exist", async () => {
    const tv = createTwilioVerify({ accountSid: "AC", authToken: undefined, serviceSid: "VA" });
    expect(tv.configured).toBe(false);
    expect(await tv.start("+15145550101")).toBe(false);
  });
  it("starts an SMS verification and approves only Twilio's code", async () => {
    const fetch = vi.fn(async (url: string, init: { body: string }) =>
      url.endsWith("/Verifications") ? res({ status: "pending" }) : res({ status: new URLSearchParams(init.body).get("Code") === "654321" ? "approved" : "pending" }));
    const tv = createTwilioVerify({ accountSid: "AC1", authToken: "t", serviceSid: "VA1", fetch });
    expect(await tv.start("+15145550101")).toBe(true);
    expect(fetch.mock.calls[0]?.[0]).toBe("https://verify.twilio.com/v2/Services/VA1/Verifications");
    expect(await tv.check("+15145550101", "000000")).toBe(false);
    expect(await tv.check("+15145550101", "654321")).toBe(true);
  });
});

describe("SMS sender uses Twilio instead of Brevo when configured", () => {
  it("posts to Twilio Messages, not Brevo", async () => {
    const fetch = vi.fn(async (_url: string, _init: unknown) => res({ sid: "SM1" }));
    const sender = createSmsSender({ apiKey: "brevo", sender: "Joblop", enabled: true, fetch, twilio: { accountSid: "AC1", authToken: "t", from: "+18335550000" } });
    const r = await sender.send({ to: "+15145550101", text: "hi" });
    expect(r).toEqual({ status: "sent", id: "SM1" });
    expect(String(fetch.mock.calls[0]?.[0])).toContain("api.twilio.com/2010-04-01/Accounts/AC1/Messages.json");
  });
  it("still respects the money gate", async () => {
    const fetch = vi.fn();
    const sender = createSmsSender({ apiKey: undefined, sender: undefined, enabled: false, fetch, twilio: { accountSid: "AC1", authToken: "t", from: "MG1" } });
    expect(await sender.send({ to: "+15145550101", text: "hi" })).toEqual({ status: "skipped", reason: "disabled" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
