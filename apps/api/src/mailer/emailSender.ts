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
  attachments?: readonly Readonly<{ name: string; contentBase64: string }>[];
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

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Every Joblop email shares one design, built from its plain text: the first paragraph is the
// headline, and a closing "— Joblop" line is dropped because the footer already signs the email.
// Inline styles and tables, because email apps ignore most other styling.
export function brandedEmailHtml(message: Pick<EmailMessage, "subject" | "text">): string {
  const paragraphs = message.text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^—\s*Joblop$/i.test(part));
  const [headline, ...rest] = paragraphs;
  const body = rest
    .map(
      (part) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3d3a34;">${escapeHtml(part).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  return [
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(message.subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;"><tr><td align="center" style="padding:24px 12px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">`,
    `<tr><td style="background:#000000;padding:22px 28px;font-size:26px;font-weight:700;color:#ffffff;">Job<span style="color:#d9a93f;">lop</span></td></tr>`,
    `<tr><td style="height:4px;background:#d9a93f;font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `<tr><td style="padding:28px;">`,
    `<p style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#111111;">${escapeHtml(headline ?? message.subject).replace(/\n/g, "<br>")}</p>`,
    body,
    `</td></tr>`,
    `<tr><td style="padding:16px 28px;background:#faf8f3;font-size:13px;line-height:1.5;color:#7a7468;">Joblop</td></tr>`,
    `</table></td></tr></table></body></html>`
  ].join("");
}

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
            htmlContent: message.html ?? brandedEmailHtml(message),
            ...(message.attachments?.length
              ? { attachment: message.attachments.map((file) => ({ name: file.name, content: file.contentBase64 })) }
              : {})
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
