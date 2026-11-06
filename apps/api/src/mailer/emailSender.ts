// Isolated transactional-email capsule. Free of any SDK — it talks to Brevo's HTTP API directly,
// and is gated: without an API key + from-address it is a no-op that
// reports "skipped" (dev surfaces the code to the caller instead of sending). This mirrors the STR
// mailer-gating model so the email-verification feature can ship dark until the owner provisions a
// provider. Injected by dependency, never reads process.env itself, so it is trivially testable.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailSendResult =
  | Readonly<{ status: "sent"; id: string }>
  | Readonly<{ status: "skipped"; reason: "not_configured" }>
  | Readonly<{ status: "error" }>;

export interface EmailSender {
  readonly configured: boolean;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

// Minimal fetch shape the sender needs — the global `fetch` satisfies it, and tests can supply a plain
// async function without wrestling with the full DOM `fetch` overloads.
export type EmailFetch = (
  input: string,
  init: Readonly<{
    method: string;
    headers: Readonly<Record<string, string>>;
    body: string;
  }>
) => Promise<Readonly<{ ok: boolean; status: number; json(): Promise<unknown> }>>;

// Parse "Name <email@domain>" or a bare address into Brevo's structured sender shape.
function parseSender(from: string): { email: string; name?: string } {
  const match = /^\s*(.+?)\s*<([^>]+)>\s*$/.exec(from);
  const name = match?.[1];
  const email = match?.[2];
  if (name && email) return { email: email.trim(), name: name.trim() };
  return { email: from.trim() };
}

export function createEmailSender(options: {
  apiKey: string | undefined;
  from: string | undefined;
  fetch?: EmailFetch;
}): EmailSender {
  const { apiKey, from } = options;
  if (!apiKey || !from) {
    return {
      configured: false,
      async send() {
        return { status: "skipped", reason: "not_configured" };
      }
    };
  }

  const doFetch = options.fetch ?? fetch;
  return {
    configured: true,
    async send(message) {
      try {
        // Brevo (formerly Sendinblue) transactional email: POST /v3/smtp/email, api-key header.
        const response = await doFetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: parseSender(from),
            to: [{ email: message.to }],
            subject: message.subject,
            textContent: message.text,
            ...(message.html ? { htmlContent: message.html } : {})
          })
        });
        if (!response.ok) return { status: "error" };
        const data = (await response.json().catch(() => ({}))) as { messageId?: unknown };
        const id = typeof data.messageId === "string" ? data.messageId : "";
        return { status: "sent", id };
      } catch {
        return { status: "error" };
      }
    }
  };
}

// Verification-code email copy lives next to the sender so wording and delivery stay together.
export function verificationEmailMessage(
  to: string,
  code: string,
  expiryMinutes = 10
): EmailMessage {
  return {
    to,
    subject: "Your Resident Workforce OS verification code",
    text: `Your Resident Workforce OS verification code is ${code}. It expires in ${expiryMinutes} minutes. If you did not request this, you can ignore this email.`
  };
}
