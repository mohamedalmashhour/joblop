// Isolated transactional-SMS capsule — the SMS twin of emailSender. It talks to Brevo's transactional
// SMS HTTP API directly (no SDK) and is DOUBLE-gated: it is a no-op "skipped" unless BOTH an API key +
// sender are present AND the feature is explicitly enabled. SMS costs real money per message, so the
// enable flag defaults OFF; nothing is ever sent until the owner flips SMS_ENABLED on (after funding
// Brevo SMS credits). Injected by dependency, never reads process.env itself, so it is trivially testable.

export interface SmsMessage {
  // Recipient in international E.164 form (e.g. "+15145551234"). Normalized to Brevo's digits form here.
  to: string;
  text: string;
}

export type SmsSendResult =
  | Readonly<{ status: "sent"; id: string }>
  | Readonly<{ status: "skipped"; reason: "not_configured" | "disabled" | "no_recipient" }>
  | Readonly<{ status: "error" }>;

export interface SmsSender {
  readonly configured: boolean;
  readonly enabled: boolean;
  send(message: SmsMessage): Promise<SmsSendResult>;
}

// Minimal fetch shape (global fetch satisfies it; tests supply a plain async fn).
export type SmsFetch = (
  input: string,
  init: Readonly<{ method: string; headers: Readonly<Record<string, string>>; body: string }>
) => Promise<Readonly<{ ok: boolean; status: number; json(): Promise<unknown> }>>;

// Brevo SMS sender is an alphanumeric id, max 11 chars, letters/digits/spaces. Fall back safely.
function normalizeSmsSender(sender: string): string {
  const cleaned = sender.replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 11);
  return cleaned.length > 0 ? cleaned : "Joblop";
}

// Brevo expects the recipient as digits with country code, no "+" and no separators.
export function toBrevoRecipient(e164: string): string {
  return e164.replace(/[^0-9]/g, "");
}

export function createSmsSender(options: {
  apiKey: string | undefined;
  sender: string | undefined;
  enabled: boolean;
  fetch?: SmsFetch;
  // Twilio Messaging (replaces Brevo SMS when all three are set). `twilioFrom` is an approved
  // Twilio number (E.164) or a Messaging Service SID (MG...).
  twilio?: { accountSid?: string | undefined; authToken?: string | undefined; from?: string | undefined };
}): SmsSender {
  const tw = options.twilio;
  if (tw?.accountSid && tw.authToken && tw.from) return createTwilioSmsSender({ ...tw, enabled: options.enabled, fetch: options.fetch } as Parameters<typeof createTwilioSmsSender>[0]);
  const { apiKey, sender, enabled } = options;
  const configured = Boolean(apiKey && sender);
  if (!configured) {
    return {
      configured: false,
      enabled,
      async send() {
        return { status: "skipped", reason: "not_configured" };
      }
    };
  }
  const brevoSender = normalizeSmsSender(sender!);
  const doFetch = options.fetch ?? fetch;
  return {
    configured: true,
    enabled,
    async send(message) {
      // Hard money gate: never hit the paid API unless explicitly enabled.
      if (!enabled) return { status: "skipped", reason: "disabled" };
      const recipient = toBrevoRecipient(message.to);
      if (recipient.length < 8) return { status: "skipped", reason: "no_recipient" };
      try {
        const response = await doFetch("https://api.brevo.com/v3/transactionalSMS/sms", {
          method: "POST",
          headers: { "api-key": apiKey!, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: brevoSender,
            recipient,
            content: message.text,
            type: "transactional"
          })
        });
        if (!response.ok) return { status: "error" };
        const data = (await response.json().catch(() => ({}))) as { messageId?: unknown; reference?: unknown };
        const id =
          typeof data.messageId === "string" || typeof data.messageId === "number"
            ? String(data.messageId)
            : typeof data.reference === "string"
              ? data.reference
              : "";
        return { status: "sent", id };
      } catch {
        return { status: "error" };
      }
    }
  };
}

function createTwilioSmsSender(options: { accountSid: string; authToken: string; from: string; enabled: boolean; fetch?: SmsFetch }): SmsSender {
  const doFetch = options.fetch ?? fetch;
  const auth = `Basic ${Buffer.from(`${options.accountSid}:${options.authToken}`).toString("base64")}`;
  return {
    configured: true,
    enabled: options.enabled,
    async send(message) {
      if (!options.enabled) return { status: "skipped", reason: "disabled" };
      const digits = toBrevoRecipient(message.to);
      if (digits.length < 8) return { status: "skipped", reason: "no_recipient" };
      const params = new URLSearchParams({ To: `+${digits}`, Body: message.text });
      params.set(/^MG/i.test(options.from) ? "MessagingServiceSid" : "From", options.from);
      try {
        const response = await doFetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(options.accountSid)}/Messages.json`, {
          method: "POST",
          headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });
        if (!response.ok) return { status: "error" };
        const data = (await response.json().catch(() => ({}))) as { sid?: unknown };
        return { status: "sent", id: typeof data.sid === "string" ? data.sid : "" };
      } catch {
        return { status: "error" };
      }
    }
  };
}
