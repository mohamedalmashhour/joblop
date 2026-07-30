import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { EmailSender } from "./mailer/emailSender";
import { verificationEmailMessage } from "./mailer/emailSender";

export const emailVerificationExpiryMinutes = 10;
export const emailVerificationMaximumAttempts = 5;

export const emailVerificationFailure = Object.freeze({
  status: "verification_failed" as const,
  message: "Verification could not be completed."
});

export interface StoredEmailVerification {
  id: string;
  userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

// This structural subset matches the verification methods already implemented
// by createPrismaAuthenticationRepository, without coupling the API capsule to
// generated Prisma types or requiring a database for its tests.
export interface EmailVerificationRepository {
  createEmailVerificationCode(input: {
    userId: string;
    codeHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<StoredEmailVerification>;
  findActiveEmailVerificationCode(
    userId: string
  ): Promise<StoredEmailVerification | null>;
  incrementEmailVerificationAttempts(input: {
    verificationId: string;
    expectedAttempts: number;
    now: Date;
  }): Promise<StoredEmailVerification | null>;
  consumeEmailVerificationCode(input: {
    verificationId: string;
    expectedAttempts: number;
    now: Date;
  }): Promise<StoredEmailVerification | null>;
  markEmailVerified(input: {
    userId: string;
    now: Date;
  }): Promise<unknown | null>;
}

export interface EmailVerificationServiceOptions {
  now?: () => Date;
  randomInteger?: (minimumInclusive: number, maximumExclusive: number) => number;
  exposeLocalCode?: boolean;
}

export interface EmailVerificationService {
  issue(input: {
    userId: string;
    emailNormalized: string;
  }): Promise<
    | Readonly<{ status: "accepted" }>
    | Readonly<{ status: "accepted"; code: string }>
  >;
  verify(input: {
    userId: string;
    code: string;
  }): Promise<
    | Readonly<{ status: "verified" }>
    | typeof emailVerificationFailure
  >;
}

export function createEmailVerificationService(
  repository: EmailVerificationRepository,
  emailSender: EmailSender,
  options: EmailVerificationServiceOptions = {}
): EmailVerificationService {
  const now = options.now ?? (() => new Date());
  const randomInteger = options.randomInteger ?? randomInt;
  const exposeLocalCode = options.exposeLocalCode === true;

  return {
    async issue(input) {
      const currentTime = now();
      const code = createSixDigitCode(randomInteger);
      await repository.createEmailVerificationCode({
        userId: input.userId,
        codeHash: hashEmailVerificationCode(code),
        expiresAt: new Date(
          currentTime.getTime() + emailVerificationExpiryMinutes * 60_000
        ),
        now: currentTime
      });

      // Delivery is intentionally fail-soft. The API must not disclose provider
      // configuration or delivery state, and local adapters may safely skip it.
      await emailSender.send(
        verificationEmailMessage(
          input.emailNormalized,
          code,
          emailVerificationExpiryMinutes
        )
      );
      return exposeLocalCode
        ? { status: "accepted", code }
        : { status: "accepted" };
    },

    async verify(input) {
      const currentTime = now();
      const verification = await repository.findActiveEmailVerificationCode(
        input.userId
      );

      if (!isUsableVerification(verification, currentTime)) {
        return emailVerificationFailure;
      }

      if (!isSixDigitCode(input.code)) {
        await recordFailedAttempt(repository, verification, currentTime);
        return emailVerificationFailure;
      }

      const submittedHash = hashEmailVerificationCode(input.code);
      if (!equalHashes(verification.codeHash, submittedHash)) {
        await recordFailedAttempt(repository, verification, currentTime);
        return emailVerificationFailure;
      }

      const consumed = await repository.consumeEmailVerificationCode({
        verificationId: verification.id,
        expectedAttempts: verification.attempts,
        now: currentTime
      });
      if (!consumed) {
        return emailVerificationFailure;
      }

      const verifiedUser = await repository.markEmailVerified({
        userId: input.userId,
        now: currentTime
      });
      return verifiedUser ? { status: "verified" } : emailVerificationFailure;
    }
  };
}

export function hashEmailVerificationCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function createSixDigitCode(
  randomInteger: (minimumInclusive: number, maximumExclusive: number) => number
): string {
  const value = randomInteger(100_000, 1_000_000);
  if (!Number.isSafeInteger(value) || value < 100_000 || value >= 1_000_000) {
    throw new Error("Email verification RNG returned an out-of-range value.");
  }
  return String(value);
}

function isSixDigitCode(code: string): boolean {
  return /^\d{6}$/u.test(code);
}

function isUsableVerification(
  verification: StoredEmailVerification | null,
  currentTime: Date
): verification is StoredEmailVerification {
  return Boolean(
    verification &&
      verification.consumedAt === null &&
      verification.attempts < emailVerificationMaximumAttempts &&
      verification.expiresAt.getTime() > currentTime.getTime()
  );
}

function equalHashes(expected: string, submitted: string): boolean {
  const expectedBytes = Buffer.from(expected, "hex");
  const submittedBytes = Buffer.from(submitted, "hex");
  if (
    expectedBytes.length !== 32 ||
    submittedBytes.length !== expectedBytes.length
  ) {
    return false;
  }
  return timingSafeEqual(expectedBytes, submittedBytes);
}

async function recordFailedAttempt(
  repository: EmailVerificationRepository,
  verification: StoredEmailVerification,
  currentTime: Date
) {
  await repository.incrementEmailVerificationAttempts({
    verificationId: verification.id,
    expectedAttempts: verification.attempts,
    now: currentTime
  });
}
