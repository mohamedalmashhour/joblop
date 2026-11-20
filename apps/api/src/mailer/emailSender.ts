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

// The gold of the Joblop logo artwork (apps/worker/public/img/joblop-logo.png).
const LOGO_GOLD = "#F8B808";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Every Joblop email shares one design, built from its plain text: the first paragraph is the
// headline, and a closing "— Joblop" line is dropped because the footer already signs the email.
// Inline styles and tables, because email apps ignore most other styling.
// Arabic (or other right-to-left) email text: the whole message is laid out right to left, so
// Latin words inside a sentence (a role, a city, "Joblop", a link) keep their place.
const RTL_TEXT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function isRightToLeftText(text: string): boolean {
  return RTL_TEXT.test(text);
}

export function brandedEmailHtml(message: Pick<EmailMessage, "subject" | "text">): string {
  const rtl = isRightToLeftText(`${message.subject}\n${message.text}`);
  const dirAttr = rtl ? ` dir="rtl"` : "";
  const align = rtl ? "text-align:right;" : "";
  const paragraphs = message.text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^—\s*Joblop$/i.test(part));
  const [headline, ...rest] = paragraphs;
  const body = rest
    .map(
      (part) =>
        `<p${dirAttr} style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3d3a34;${align}">${escapeHtml(part).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  return [
    `<!doctype html><html${rtl ? ` dir="rtl" lang="ar"` : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(message.subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;"><tr><td align="center" style="padding:24px 12px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">`,
    // The wordmark as in the logo: white letters with the two "o"s in the logo's gold.
    `<tr><td style="background:#000000;padding:22px 28px;font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">J<span style="color:${LOGO_GOLD};">o</span>bl<span style="color:${LOGO_GOLD};">o</span>p</td></tr>`,
    `<tr><td style="height:4px;background:${LOGO_GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>`,
    `<tr><td${dirAttr} style="padding:28px;${align}">`,
    `<p${dirAttr} style="margin:0 0 18px;font-size:20px;line-height:1.4;font-weight:700;color:#111111;${align}">${escapeHtml(headline ?? message.subject).replace(/\n/g, "<br>")}</p>`,
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
  expiryMinutes = 10,
  language: "en" | "fr" | "ar" = "en"
): EmailMessage {
  if (language === "fr") {
    return {
      to,
      subject: "Votre code de vérification Joblop",
      text: `Votre code de vérification Joblop est ${code}. Il expire dans ${expiryMinutes} minutes. Si vous n'avez rien demandé, vous pouvez ignorer ce courriel.`
    };
  }
  if (language === "ar") {
    return {
      to,
      subject: "رمز التحقق من Joblop",
      text: `رمز التحقق الخاص بك من Joblop هو ${code}. تنتهي صلاحيته خلال ${expiryMinutes} دقائق. إذا لم تطلبه، يمكنك تجاهل هذه الرسالة.`
    };
  }
  return {
    to,
    subject: "Your Joblop verification code",
    text: `Your Joblop verification code is ${code}. It expires in ${expiryMinutes} minutes. If you did not request this, you can ignore this email.`
  };
}
