import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hashPassword, normalizeEmail } from "@rwos/auth";
import type { EmailSender } from "./mailer/emailSender";
import type { SmsSender } from "./mailer/smsSender";

export const passwordResetExpiryMinutes = 30;
export const passwordResetAccepted = Object.freeze({
  status: "accepted" as const,
  message: "If an account matches that email, password reset instructions will be sent."
});
export const passwordResetFailure = Object.freeze({
  status: "reset_failed" as const,
  message: "Password reset could not be completed. Request a new link and try again."
});

export interface PasswordResetRepository {
  findEligibleUser(
    emailNormalized: string
  ): Promise<{ id: string; publicId: string; phone?: string | null } | null>;
  createToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void>;
  complete(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<{ userId: string } | null>;
  recordRequest(input: { userId: string; publicId: string; now: Date }): Promise<void>;
}

export interface PasswordResetService {
  request(input: { email: string; resetBaseUrl: string }): Promise<typeof passwordResetAccepted>;
  complete(input: {
    token: string;
    newPassword: string;
  }): Promise<Readonly<{ status: "reset" }> | typeof passwordResetFailure>;
}

export function createPasswordResetService(
  repository: PasswordResetRepository,
  emailSender: EmailSender,
  options: {
    now?: () => Date;
    randomToken?: () => string;
    // Optional SMS twin (fail-soft, money-gated in the sender): also texts the reset link when a phone
    // is on file for the account.
    smsSender?: SmsSender;
  } = {}
): PasswordResetService {
  const now = options.now ?? (() => new Date());
  const randomToken = options.randomToken ?? (() => randomBytes(32).toString("base64url"));

  return {
    async request(input) {
      const currentTime = now();
      const user = await repository.findEligibleUser(normalizeEmail(input.email));
      if (!user) return passwordResetAccepted;

      const token = randomToken();
      const tokenHash = hashPasswordResetToken(token);
      await repository.createToken({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(currentTime.getTime() + passwordResetExpiryMinutes * 60_000),
        now: currentTime
      });
      await repository.recordRequest({ userId: user.id, publicId: user.publicId, now: currentTime });

      const resetUrl = new URL("/reset-password", input.resetBaseUrl);
      resetUrl.searchParams.set("token", token);
      await emailSender.send({
        to: input.email,
        subject: "Reset your Joblop password",
        text:
          `Use this single-use link within ${passwordResetExpiryMinutes} minutes to reset your password: ` +
          `${resetUrl.toString()}\n\nIf you did not request this, you can ignore this message.`
      });
      // SMS twin (fail-soft, money-gated in the sender): text the reset link when a phone is on file.
      if (options.smsSender && user.phone) {
        await options.smsSender
          .send({
            to: user.phone,
            text: `JobLop password reset (valid ${passwordResetExpiryMinutes} min): ${resetUrl.toString()}`
          })
          .catch(() => undefined);
      }
      return passwordResetAccepted;
    },

    async complete(input) {
      if (!isSafeToken(input.token)) return passwordResetFailure;
      const passwordHash = await hashPassword(input.newPassword).catch(() => null);
      if (!passwordHash) return passwordResetFailure;
      const result = await repository.complete({
        tokenHash: hashPasswordResetToken(input.token),
        passwordHash,
        now: now()
      });
      return result ? { status: "reset" } : passwordResetFailure;
    }
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function constantTimeTokenHashEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return (
    leftBytes.length === 32 &&
    rightBytes.length === 32 &&
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function isSafeToken(token: string) {
  return /^[A-Za-z0-9_-]{32,256}$/u.test(token);
}
