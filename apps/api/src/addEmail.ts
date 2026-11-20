import { randomBytes } from "node:crypto";
import { normalizeEmail } from "@rwos/auth";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import {
  hashEmailVerificationCode,
  type EmailVerificationRepository,
  type StoredEmailVerification
} from "./emailVerification";

// "Add your email" (item 45). Sign-in stays by texted code, but every account should have an email
// that works, so invoices and notices reach the person. A signed-in user adds (or replaces, while it
// is not yet confirmed) their email; we email them a single-use confirmation link that expires.
//
// This reuses the existing email-verification mechanism: the token is stored hashed (SHA-256, same
// hash as the 6-digit code) in the same email_verification_codes table, through the same
// createEmailVerificationCode / consumeEmailVerificationCode / markEmailVerified repository methods.
// Issuing a link retires any older open code or link for that user, exactly like the code flow.

export const addEmailLinkExpiryHours = 24;
export const emailInUseMessage = "This email is already used by another account";
export const addEmailInvalidMessage = "Enter a valid email address.";
export const confirmEmailFailure = Object.freeze({
  status: "confirm_failed" as const,
  message: "This link has expired or was already used. Send a new one from your Joblop account."
});

export type AddEmailLanguage = "en" | "fr" | "ar";

export interface AddEmailRepository
  extends Pick<
    EmailVerificationRepository,
    "createEmailVerificationCode" | "consumeEmailVerificationCode" | "markEmailVerified"
  > {
  /** The id of the account that already uses this email, or null. */
  findUserIdByEmail(emailNormalized: string): Promise<string | null>;
  /** Puts the new email on the account (not confirmed). "in_use" when another account holds it. */
  setUnconfirmedEmail(input: { userId: string; emailNormalized: string; now: Date }): Promise<"set" | "in_use">;
  findEmailVerificationByHash(codeHash: string): Promise<StoredEmailVerification | null>;
}

export type AddEmailResult =
  | Readonly<{ status: "sent"; email: string }>
  | Readonly<{ status: "sent"; email: string; link: string }>
  | Readonly<{ status: "invalid_email" }>
  | Readonly<{ status: "in_use" }>
  | Readonly<{ status: "already_confirmed" }>;

export interface AddEmailService {
  add(input: {
    userId: string;
    email: string;
    alreadyConfirmed: boolean;
    confirmBaseUrl: string;
    language?: AddEmailLanguage;
  }): Promise<AddEmailResult>;
  confirm(input: { token: string }): Promise<Readonly<{ status: "confirmed" }> | typeof confirmEmailFailure>;
}

export function createAddEmailService(
  repository: AddEmailRepository,
  emailSender: EmailSender,
  options: { now?: () => Date; randomToken?: () => string; exposeLocalLink?: boolean } = {}
): AddEmailService {
  const now = options.now ?? (() => new Date());
  const randomToken = options.randomToken ?? (() => randomBytes(32).toString("base64url"));

  return {
    async add(input) {
      const emailNormalized = normalizeEmail(input.email);
      if (!isPlausibleEmail(emailNormalized)) return { status: "invalid_email" };
      if (input.alreadyConfirmed) return { status: "already_confirmed" };

      const currentTime = now();
      const owner = await repository.findUserIdByEmail(emailNormalized);
      if (owner && owner !== input.userId) return { status: "in_use" };
      if (!owner) {
        const set = await repository.setUnconfirmedEmail({
          userId: input.userId,
          emailNormalized,
          now: currentTime
        });
        if (set === "in_use") return { status: "in_use" };
      }

      const token = randomToken();
      await repository.createEmailVerificationCode({
        userId: input.userId,
        codeHash: hashEmailVerificationCode(token),
        expiresAt: new Date(currentTime.getTime() + addEmailLinkExpiryHours * 3_600_000),
        now: currentTime
      });
      const link = new URL("/confirm-email", input.confirmBaseUrl);
      link.searchParams.set("token", token);
      // Delivery is fail-soft, like the code email: the API never discloses provider state.
      await emailSender.send(confirmEmailMessage(emailNormalized, link.toString(), input.language ?? "en"));
      return options.exposeLocalLink === true
        ? { status: "sent", email: emailNormalized, link: link.toString() }
        : { status: "sent", email: emailNormalized };
    },

    async confirm(input) {
      if (!/^[A-Za-z0-9_-]{32,256}$/u.test(input.token)) return confirmEmailFailure;
      const currentTime = now();
      const verification = await repository.findEmailVerificationByHash(hashEmailVerificationCode(input.token));
      if (
        !verification ||
        verification.consumedAt !== null ||
        verification.expiresAt.getTime() <= currentTime.getTime()
      ) {
        return confirmEmailFailure;
      }
      const consumed = await repository.consumeEmailVerificationCode({
        verificationId: verification.id,
        expectedAttempts: verification.attempts,
        now: currentTime
      });
      if (!consumed) return confirmEmailFailure;
      const verified = await repository.markEmailVerified({ userId: verification.userId, now: currentTime });
      return verified ? { status: "confirmed" } : confirmEmailFailure;
    }
  };
}

export function isPlausibleEmail(value: string): boolean {
  return value.length >= 6 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value);
}

export function resolveAddEmailLanguage(value: string | null | undefined): AddEmailLanguage {
  const v = (value ?? "").toLowerCase();
  return v.startsWith("fr") ? "fr" : v.startsWith("ar") ? "ar" : "en";
}

export function confirmEmailMessage(to: string, link: string, language: AddEmailLanguage): EmailMessage {
  if (language === "fr") {
    return {
      to,
      subject: "Confirmez votre courriel Joblop",
      text: `Touchez ce lien pour confirmer votre courriel pour Joblop :\n${link}\n\nLe lien fonctionne une seule fois et expire dans ${addEmailLinkExpiryHours} heures. Si vous n’avez rien demandé, ignorez ce courriel.`
    };
  }
  if (language === "ar") {
    return {
      to,
      subject: "أكّد بريدك الإلكتروني في Joblop",
      text: `اضغط هذا الرابط لتأكيد بريدك الإلكتروني في Joblop:\n${link}\n\nيعمل الرابط مرة واحدة وتنتهي صلاحيته بعد ${addEmailLinkExpiryHours} ساعة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.`
    };
  }
  return {
    to,
    subject: "Confirm your Joblop email",
    text: `Tap this link to confirm your email for Joblop:\n${link}\n\nThe link works once and expires in ${addEmailLinkExpiryHours} hours. If you did not ask for this, you can ignore this email.`
  };
}

// ── Prisma adapter ────────────────────────────────────────────────────────────────────────────────
// Structural subset only, so the capsule stays testable without generated Prisma types.
type AddEmailPrisma = {
  user: {
    findUnique(input: { where: { emailNormalized: string }; select: { id: true } }): Promise<{ id: string } | null>;
    update(input: { where: { id: string }; data: { emailNormalized: string } }): Promise<unknown>;
  };
  userIdentity: {
    updateMany(input: {
      where: { userId: string; provider?: "local_password"; emailVerifiedAt?: null };
      data: { providerSubject: string } | { emailVerifiedAt: Date };
    }): Promise<{ count: number }>;
  };
  emailVerificationCode: {
    findFirst(input: {
      where: { codeHash: string };
      orderBy: { createdAt: "desc" };
    }): Promise<StoredEmailVerification | null>;
  };
  $transaction<T>(work: (transaction: AddEmailPrisma) => Promise<T>): Promise<T>;
};

export function createPrismaAddEmailRepository(
  prismaClient: unknown,
  verificationRepository: Pick<
    EmailVerificationRepository,
    "createEmailVerificationCode" | "consumeEmailVerificationCode" | "markEmailVerified"
  >
): AddEmailRepository {
  const prisma = prismaClient as AddEmailPrisma;
  return {
    createEmailVerificationCode: (input) => verificationRepository.createEmailVerificationCode(input),
    consumeEmailVerificationCode: (input) => verificationRepository.consumeEmailVerificationCode(input),

    async markEmailVerified(input) {
      const user = (await verificationRepository.markEmailVerified(input)) as
        | { identities?: readonly { emailVerifiedAt: Date | null }[] }
        | null;
      if (!user) return null;
      // An account without a password identity (for example Google only): mark its identities so
      // the session reports the email as confirmed.
      if (user.identities && !user.identities.some((identity) => identity.emailVerifiedAt)) {
        await prisma.userIdentity.updateMany({
          where: { userId: input.userId, emailVerifiedAt: null },
          data: { emailVerifiedAt: input.now }
        });
      }
      return user;
    },

    async findUserIdByEmail(emailNormalized) {
      const user = await prisma.user.findUnique({ where: { emailNormalized }, select: { id: true } });
      return user?.id ?? null;
    },

    async setUnconfirmedEmail(input) {
      try {
        await prisma.$transaction(async (transaction) => {
          await transaction.user.update({
            where: { id: input.userId },
            data: { emailNormalized: input.emailNormalized }
          });
          // The password identity is keyed by the account email; keep it in step.
          await transaction.userIdentity.updateMany({
            where: { userId: input.userId, provider: "local_password" },
            data: { providerSubject: input.emailNormalized }
          });
        });
        return "set";
      } catch (error) {
        if (isUniqueViolation(error)) return "in_use";
        throw error;
      }
    },

    findEmailVerificationByHash(codeHash) {
      return prisma.emailVerificationCode.findFirst({ where: { codeHash }, orderBy: { createdAt: "desc" } });
    }
  };
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "P2002");
}
