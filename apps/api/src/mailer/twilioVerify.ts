// Twilio Verify capsule: SMS one-time codes through Twilio's pre-approved sender pool, so Canadian
// numbers receive codes without our own toll-free sender approval. Twilio generates and checks its own
// code; the phone sign-in accepts either our stored code (emailed / Brevo SMS) or Twilio's.
// Injected by dependency, never reads process.env itself.

export interface TwilioVerify {
  readonly configured: boolean;
  start(toE164: string): Promise<boolean>;
  check(toE164: string, code: string): Promise<boolean>;
}

export type TwilioFetch = (
  input: string,
  init: Readonly<{ method: string; headers: Readonly<Record<string, string>>; body: string }>
) => Promise<Readonly<{ ok: boolean; status: number; json(): Promise<unknown> }>>;

export function createTwilioVerify(options: {
  accountSid: string | undefined;
  authToken: string | undefined;
  serviceSid: string | undefined;
  fetch?: TwilioFetch;
}): TwilioVerify {
  const { accountSid, authToken, serviceSid } = options;
  if (!accountSid || !authToken || !serviceSid) {
    return { configured: false, async start() { return false; }, async check() { return false; } };
  }
  const doFetch = options.fetch ?? fetch;
  const auth = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const call = async (path: string, params: Record<string, string>) => {
    try {
      const response = await doFetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/${path}`, {
        method: "POST",
        headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString()
      });
      if (!response.ok) return null;
      return (await response.json().catch(() => ({}))) as { status?: unknown };
    } catch {
      return null;
    }
  };
  return {
    configured: true,
    async start(to) {
      return (await call("Verifications", { To: to, Channel: "sms" })) !== null;
    },
    async check(to, code) {
      const data = await call("VerificationCheck", { To: to, Code: code });
      return data?.status === "approved";
    }
  };
}
