import type {
  StoredAuthenticationUser
} from "@rwos/auth";
import { describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import {
  createEmailVerificationService,
  emailVerificationFailure,
  hashEmailVerificationCode,
  type EmailVerificationRepository,
  type StoredEmailVerification
} from "./emailVerification";

const user: StoredAuthenticationUser = {
  id: "user-1",
  publicId: "usr_test",
  emailNormalized: "worker@example.test",
  displayName: "Synthetic Worker",
  status: "active",
  identities: []
};

describe("email verification service", () => {
  it("creates a hashed six-digit code with a ten-minute expiry and sends it locally", async () => {
    const now = new Date("2026-07-30T15:00:00.000Z");
    const repository = new MemoryEmailVerificationRepository();
    const sender = new CapturingEmailSender();
    const service = createEmailVerificationService(repository, sender, {
      now: () => now,
      randomInteger(minimum, maximum) {
        expect([minimum, maximum]).toEqual([100_000, 1_000_000]);
        return 123_456;
      }
    });

    await expect(
      service.issue({
        userId: user.id,
        emailNormalized: user.emailNormalized,
        language: "en"
      })
    ).resolves.toEqual({ status: "accepted" });

    expect(sender.messages).toHaveLength(1);
    expect(sender.messages[0]).toMatchObject({
      to: "worker@example.test",
      subject: "Your Joblop verification code"
    });
    // In the account's language; French (Québec default) when none is stored.
    await service.issue({ userId: user.id, emailNormalized: user.emailNormalized, language: "ar" });
    expect(sender.messages[1]?.subject).toBe("رمز التحقق من Joblop");
    await service.issue({ userId: user.id, emailNormalized: user.emailNormalized });
    expect(sender.messages[2]?.subject).toBe("Votre code de vérification Joblop");
    expect(sender.messages[0]?.text).toContain("123456");
    expect(repository.active?.codeHash).toBe(hashEmailVerificationCode("123456"));
    expect(repository.active?.codeHash).not.toContain("123456");
    expect(repository.active?.expiresAt.toISOString()).toBe(
      "2026-07-30T15:10:00.000Z"
    );
  });

  it("accepts a correct code once and rejects replay with the generic failure", async () => {
    const clock = mutableClock();
    const repository = new MemoryEmailVerificationRepository();
    const service = createEmailVerificationService(
      repository,
      new CapturingEmailSender(),
      { now: clock.now, randomInteger: () => 654_321 }
    );
    await service.issue({
      userId: user.id,
      emailNormalized: user.emailNormalized
    });

    await expect(
      service.verify({ userId: user.id, code: "654321" })
    ).resolves.toEqual({ status: "verified" });
    expect(repository.verifiedAt).toEqual(clock.now());
    await expect(
      service.verify({ userId: user.id, code: "654321" })
    ).resolves.toBe(emailVerificationFailure);
  });

  it("locks the challenge after five failed attempts", async () => {
    const repository = new MemoryEmailVerificationRepository();
    const service = createEmailVerificationService(
      repository,
      new CapturingEmailSender(),
      { randomInteger: () => 222_222 }
    );
    await service.issue({
      userId: user.id,
      emailNormalized: user.emailNormalized
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.verify({ userId: user.id, code: "111111" })
      ).resolves.toBe(emailVerificationFailure);
    }
    expect(repository.active?.attempts).toBe(5);
    await expect(
      service.verify({ userId: user.id, code: "222222" })
    ).resolves.toBe(emailVerificationFailure);
    expect(repository.verifiedAt).toBeNull();
  });

  it("uses the same failure for malformed, unknown, expired, and boundary-expired codes", async () => {
    const clock = mutableClock();
    const repository = new MemoryEmailVerificationRepository();
    const service = createEmailVerificationService(
      repository,
      new CapturingEmailSender(),
      { now: clock.now, randomInteger: () => 333_333 }
    );

    await expect(
      service.verify({ userId: "missing", code: "333333" })
    ).resolves.toBe(emailVerificationFailure);
    await service.issue({
      userId: user.id,
      emailNormalized: user.emailNormalized
    });
    await expect(
      service.verify({ userId: user.id, code: "not-a-code" })
    ).resolves.toBe(emailVerificationFailure);

    clock.advance(10 * 60_000);
    await expect(
      service.verify({ userId: user.id, code: "333333" })
    ).resolves.toBe(emailVerificationFailure);
  });

  it("invalidates an older code when a replacement is issued", async () => {
    const repository = new MemoryEmailVerificationRepository();
    let nextCode = 444_444;
    const service = createEmailVerificationService(
      repository,
      new CapturingEmailSender(),
      { randomInteger: () => nextCode }
    );
    await service.issue({
      userId: user.id,
      emailNormalized: user.emailNormalized
    });
    nextCode = 555_555;
    await service.issue({
      userId: user.id,
      emailNormalized: user.emailNormalized
    });

    await expect(
      service.verify({ userId: user.id, code: "444444" })
    ).resolves.toBe(emailVerificationFailure);
    await expect(
      service.verify({ userId: user.id, code: "555555" })
    ).resolves.toEqual({ status: "verified" });
  });

  it("keeps provider skip and error states out of the API result", async () => {
    const repository = new MemoryEmailVerificationRepository();
    for (const result of [
      { status: "skipped", reason: "not_configured" } as const,
      { status: "error" } as const
    ]) {
      const service = createEmailVerificationService(repository, {
        configured: false,
        async send() {
          return result;
        }
      });
      await expect(
        service.issue({
          userId: user.id,
          emailNormalized: user.emailNormalized
        })
      ).resolves.toEqual({ status: "accepted" });
    }
  });

  it("exposes the code only when the local-development option is explicitly enabled", async () => {
    const repository = new MemoryEmailVerificationRepository();
    const service = createEmailVerificationService(
      repository,
      new CapturingEmailSender(),
      { randomInteger: () => 777_777, exposeLocalCode: true }
    );
    await expect(
      service.issue({
        userId: user.id,
        emailNormalized: user.emailNormalized
      })
    ).resolves.toEqual({ status: "accepted", code: "777777" });
  });

  it("rejects an invalid injected RNG result", async () => {
    const service = createEmailVerificationService(
      new MemoryEmailVerificationRepository(),
      new CapturingEmailSender(),
      { randomInteger: () => 99_999 }
    );
    await expect(
      service.issue({
        userId: user.id,
        emailNormalized: user.emailNormalized
      })
    ).rejects.toThrow("out-of-range");
  });
});

class CapturingEmailSender implements EmailSender {
  readonly configured = false;
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage) {
    this.messages.push(message);
    return { status: "skipped" as const, reason: "not_configured" as const };
  }
}

class MemoryEmailVerificationRepository
  implements EmailVerificationRepository
{
  active: StoredEmailVerification | null = null;
  verifiedAt: Date | null = null;
  private sequence = 0;

  async createEmailVerificationCode(input: {
    userId: string;
    codeHash: string;
    expiresAt: Date;
    now: Date;
  }) {
    if (this.active) {
      this.active.consumedAt = input.now;
    }
    this.sequence += 1;
    this.active = {
      id: `verification-${this.sequence}`,
      userId: input.userId,
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: input.now
    };
    return this.active;
  }

  async findActiveEmailVerificationCode(userId: string) {
    return this.active?.userId === userId &&
      this.active.consumedAt === null
      ? this.active
      : null;
  }

  async incrementEmailVerificationAttempts(input: {
    verificationId: string;
    expectedAttempts: number;
    now: Date;
  }) {
    if (
      !this.active ||
      this.active.id !== input.verificationId ||
      this.active.attempts !== input.expectedAttempts ||
      this.active.consumedAt
    ) {
      return null;
    }
    this.active.attempts += 1;
    return this.active;
  }

  async consumeEmailVerificationCode(input: {
    verificationId: string;
    expectedAttempts: number;
    now: Date;
  }) {
    if (
      !this.active ||
      this.active.id !== input.verificationId ||
      this.active.attempts !== input.expectedAttempts ||
      this.active.consumedAt
    ) {
      return null;
    }
    this.active.consumedAt = input.now;
    return this.active;
  }

  async markEmailVerified(input: { userId: string; now: Date }) {
    if (input.userId !== user.id) return null;
    this.verifiedAt = input.now;
    return user;
  }
}

function mutableClock() {
  let value = new Date("2026-07-30T15:00:00.000Z");
  return {
    now: () => new Date(value),
    advance(milliseconds: number) {
      value = new Date(value.getTime() + milliseconds);
    }
  };
}
