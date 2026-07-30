import { describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import {
  createPasswordResetService,
  hashPasswordResetToken,
  passwordResetAccepted,
  passwordResetFailure,
  type PasswordResetRepository
} from "./passwordReset";

describe("password reset service", () => {
  it("returns the same generic response for existing and missing accounts", async () => {
    const repository = new MemoryPasswordResetRepository();
    const sender = new CapturingSender();
    const service = createPasswordResetService(repository, sender, {
      now: () => new Date("2026-07-30T12:00:00.000Z"),
      randomToken: () => "a".repeat(43)
    });

    await expect(
      service.request({ email: "OWNER@EXAMPLE.TEST", resetBaseUrl: "http://127.0.0.1:3100" })
    ).resolves.toBe(passwordResetAccepted);
    await expect(
      service.request({ email: "missing@example.test", resetBaseUrl: "http://127.0.0.1:3100" })
    ).resolves.toBe(passwordResetAccepted);
    expect(repository.created).toEqual([
      expect.objectContaining({ tokenHash: hashPasswordResetToken("a".repeat(43)) })
    ]);
    expect(sender.messages).toHaveLength(1);
    expect(sender.messages[0]?.text).not.toContain("ValidPassword123");
  });

  it("consumes a token once, changes the password through the approved hasher, and rejects replay", async () => {
    const repository = new MemoryPasswordResetRepository();
    const service = createPasswordResetService(repository, new CapturingSender(), {
      now: () => new Date("2026-07-30T12:00:00.000Z")
    });
    const token = "b".repeat(43);
    repository.validTokenHash = hashPasswordResetToken(token);

    await expect(
      service.complete({ token, newPassword: "ReplacementPassword123" })
    ).resolves.toEqual({ status: "reset" });
    await expect(
      service.complete({ token, newPassword: "ReplacementPassword123" })
    ).resolves.toBe(passwordResetFailure);
    expect(repository.completedPasswordHash).toMatch(/^scrypt:v1:/u);
  });

  it("fails closed for malformed tokens and passwords that do not meet policy", async () => {
    const service = createPasswordResetService(
      new MemoryPasswordResetRepository(),
      new CapturingSender()
    );
    await expect(
      service.complete({ token: "short", newPassword: "ReplacementPassword123" })
    ).resolves.toBe(passwordResetFailure);
    await expect(
      service.complete({ token: "c".repeat(43), newPassword: "weak" })
    ).resolves.toBe(passwordResetFailure);
  });
});

class CapturingSender implements EmailSender {
  configured = false;
  messages: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.messages.push(message);
    return { status: "skipped", reason: "not_configured" } as const;
  }
}

class MemoryPasswordResetRepository implements PasswordResetRepository {
  created: Parameters<PasswordResetRepository["createToken"]>[0][] = [];
  validTokenHash: string | null = null;
  completedPasswordHash: string | null = null;

  async findEligibleUser(emailNormalized: string) {
    return emailNormalized === "owner@example.test"
      ? { id: "00000000-0000-4000-8000-000000000001", publicId: "usr_owner" }
      : null;
  }
  async createToken(input: Parameters<PasswordResetRepository["createToken"]>[0]) {
    this.created.push(input);
  }
  async complete(input: Parameters<PasswordResetRepository["complete"]>[0]) {
    if (input.tokenHash !== this.validTokenHash) return null;
    this.validTokenHash = null;
    this.completedPasswordHash = input.passwordHash;
    return { userId: "00000000-0000-4000-8000-000000000001" };
  }
  async recordRequest() {}
}
