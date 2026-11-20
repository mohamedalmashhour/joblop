import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import type { SmsMessage, SmsSender } from "../mailer/smsSender";

// Records email/SMS sends that FAILED (provider error or exception) so the brain can find and re-send
// them. A "skipped" send (provider not configured, SMS switched off) is not a failure and is not kept.
// The message text is stored only when it is safe to send again: never a one-time code, never an email
// with attachments (an invoice PDF is re-sent by staff from the invoice). Recording never throws and
// never changes what the caller gets back.

export type DeliveryFailureInput = Readonly<{
  channel: "email" | "sms";
  recipient: string;
  subject: string | null;
  body: string;
  hasAttachments: boolean;
}>;

export type DeliveryFailureRecorder = (failure: DeliveryFailureInput) => Promise<void>;

const CODE_WORDS = /\b(code|codes|verification|vérification|password|mot de passe|sign-in|connexion)\b/i;
const CODE_DIGITS = /\b\d{4,8}\b/;
// A link that signs someone in or confirms an email must not be sent twice either.
const TOKEN_LINK = /[?&](token|code|key)=/i;

/** False for anything that must not be sent a second time without a person looking. */
export function isSafeToResend(failure: Pick<DeliveryFailureInput, "body" | "subject" | "hasAttachments">): boolean {
  if (failure.hasAttachments) return false;
  const text = `${failure.subject ?? ""}\n${failure.body}`;
  if (TOKEN_LINK.test(text)) return false;
  if (CODE_WORDS.test(text) && CODE_DIGITS.test(text)) return false;
  return true;
}

export function createPrismaDeliveryFailureRecorder(
  prisma: Pick<PrismaClient, "messageDeliveryFailure">,
  now: () => Date = () => new Date()
): DeliveryFailureRecorder {
  return async (failure) => {
    try {
      const retryable = isSafeToResend(failure);
      await prisma.messageDeliveryFailure.create({
        data: {
          channel: failure.channel,
          recipient: failure.recipient.slice(0, 320),
          subject: failure.subject?.slice(0, 500) ?? null,
          body: retryable ? failure.body.slice(0, 20_000) : null,
          retryable,
          failedAt: now()
        }
      });
    } catch {
      // Never let bookkeeping break a send.
    }
  };
}

export function withEmailFailureRecording(inner: EmailSender, record: DeliveryFailureRecorder): EmailSender {
  return {
    get configured() {
      return inner.configured;
    },
    async send(message: EmailMessage) {
      const failure = () =>
        record({ channel: "email", recipient: message.to, subject: message.subject, body: message.text, hasAttachments: (message.attachments?.length ?? 0) > 0 });
      try {
        const result = await inner.send(message);
        if (result.status === "error") await failure();
        return result;
      } catch (error) {
        await failure();
        throw error;
      }
    }
  };
}

export function withSmsFailureRecording(inner: SmsSender, record: DeliveryFailureRecorder): SmsSender {
  return {
    get configured() {
      return inner.configured;
    },
    get enabled() {
      return inner.enabled;
    },
    async send(message: SmsMessage) {
      const failure = () => record({ channel: "sms", recipient: message.to, subject: null, body: message.text, hasAttachments: false });
      try {
        const result = await inner.send(message);
        if (result.status === "error") await failure();
        return result;
      } catch (error) {
        await failure();
        throw error;
      }
    }
  };
}

/** Clear stored message text a week after the failure (the row itself stays for the record). */
export async function purgeOldDeliveryBodies(prisma: Pick<PrismaClient, "messageDeliveryFailure">, now: Date): Promise<number> {
  const result = await prisma.messageDeliveryFailure.updateMany({
    where: { failedAt: { lt: new Date(now.getTime() - 7 * 86_400_000) }, body: { not: null } },
    data: { body: null }
  });
  return result.count;
}
