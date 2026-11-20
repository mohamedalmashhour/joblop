import { describe, expect, it } from "vitest";
import {
  addEmailLinkExpiryHours,
  confirmEmailFailure,
  confirmEmailMessage,
  createAddEmailService,
  createPrismaAddEmailRepository,
  type AddEmailRepository
} from "./addEmail";
import { hashEmailVerificationCode, type StoredEmailVerification } from "./emailVerification";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";

const TOKEN_A = "a".repeat(43);
const TOKEN_B = "b".repeat(43);

class MemoryAddEmailRepository implements AddEmailRepository {
  users = new Map<string, { email: string; verified: boolean }>();
  codes: StoredEmailVerification[] = [];

  async findUserIdByEmail(emailNormalized: string) {
    for (const [id, user] of this.users) if (user.email === emailNormalized) return id;
    return null;
  }
  async setUnconfirmedEmail(input: { userId: string; emailNormalized: string }) {
    if (await this.findUserIdByEmail(input.emailNormalized)) return "in_use" as const;
    const user = this.users.get(input.userId);
    if (user) user.email = input.emailNormalized;
    return "set" as const;
  }
  async createEmailVerificationCode(input: { userId: string; codeHash: string; expiresAt: Date; now: Date }) {
    for (const code of this.codes) if (code.userId === input.userId && !code.consumedAt) code.consumedAt = input.now;
    const row: StoredEmailVerification = {
      id: `v${this.codes.length + 1}`,
      userId: input.userId,
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: input.now
    };
    this.codes.push(row);
    return row;
  }
  async findEmailVerificationByHash(codeHash: string) {
    return [...this.codes].reverse().find((code) => code.codeHash === codeHash) ?? null;
  }
  async consumeEmailVerificationCode(input: { verificationId: string; expectedAttempts: number; now: Date }) {
    const row = this.codes.find((code) => code.id === input.verificationId);
    if (!row || row.consumedAt || row.attempts !== input.expectedAttempts) return null;
    row.consumedAt = input.now;
    return row;
  }
  async markEmailVerified(input: { userId: string }) {
    const user = this.users.get(input.userId);
    if (!user) return null;
    user.verified = true;
    return user;
  }
}

function setup(startAt = new Date("2026-11-10T12:00:00.000Z")) {
  const repository = new MemoryAddEmailRepository();
  repository.users.set("worker-1", { email: "old-typo@example.test", verified: false });
  repository.users.set("other-1", { email: "taken@example.test", verified: true });
  const sent: EmailMessage[] = [];
  const sender: EmailSender = {
    configured: true,
    async send(message) {
      sent.push(message);
      return { status: "sent", id: "m1" };
    }
  };
  const clock = { now: startAt };
  const tokens = [TOKEN_A, TOKEN_B];
  const service = createAddEmailService(repository, sender, {
    now: () => clock.now,
    randomToken: () => tokens.shift() ?? "c".repeat(43)
  });
  return { repository, sent, clock, service };
}

const base = { userId: "worker-1", alreadyConfirmed: false, confirmBaseUrl: "https://joblop.example.test" };

describe("add your email", () => {
  it("stores the new email unconfirmed and emails a single-use link (token stored hashed)", async () => {
    const { repository, sent, service } = setup();
    const result = await service.add({ ...base, email: "  New@Example.TEST " });
    expect(result).toEqual({ status: "sent", email: "new@example.test" });
    expect(repository.users.get("worker-1")).toEqual({ email: "new@example.test", verified: false });
    expect(repository.codes).toHaveLength(1);
    expect(repository.codes[0]?.codeHash).toBe(hashEmailVerificationCode(TOKEN_A));
    expect(repository.codes[0]?.codeHash).not.toContain(TOKEN_A);
    expect(repository.codes[0]?.expiresAt.toISOString()).toBe("2026-11-11T12:00:00.000Z");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("new@example.test");
    expect(sent[0]?.text).toContain(`https://joblop.example.test/confirm-email?token=${TOKEN_A}`);
    expect(sent[0]?.text).toContain(`${addEmailLinkExpiryHours} hours`);
  });

  it("rejects an email already used by another account", async () => {
    const { repository, sent, service } = setup();
    await expect(service.add({ ...base, email: "Taken@example.test" })).resolves.toEqual({ status: "in_use" });
    expect(repository.users.get("worker-1")?.email).toBe("old-typo@example.test");
    expect(repository.codes).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("resends to the same email without changing it, and only the newest link works", async () => {
    const { service } = setup();
    await service.add({ ...base, email: "new@example.test" });
    await expect(service.add({ ...base, email: "new@example.test" })).resolves.toEqual({
      status: "sent",
      email: "new@example.test"
    });
    await expect(service.confirm({ token: TOKEN_A })).resolves.toBe(confirmEmailFailure);
    await expect(service.confirm({ token: TOKEN_B })).resolves.toEqual({ status: "confirmed" });
  });

  it("rejects a bad email and an account whose email is already confirmed", async () => {
    const { sent, service } = setup();
    await expect(service.add({ ...base, email: "not-an-email" })).resolves.toEqual({ status: "invalid_email" });
    await expect(service.add({ ...base, alreadyConfirmed: true, email: "new@example.test" })).resolves.toEqual({
      status: "already_confirmed"
    });
    expect(sent).toHaveLength(0);
  });

  it("confirms with a valid link", async () => {
    const { repository, service } = setup();
    await service.add({ ...base, email: "new@example.test" });
    await expect(service.confirm({ token: TOKEN_A })).resolves.toEqual({ status: "confirmed" });
    expect(repository.users.get("worker-1")).toEqual({ email: "new@example.test", verified: true });
  });

  it("refuses an expired link", async () => {
    const { repository, clock, service } = setup();
    await service.add({ ...base, email: "new@example.test" });
    clock.now = new Date(clock.now.getTime() + addEmailLinkExpiryHours * 3_600_000 + 1);
    await expect(service.confirm({ token: TOKEN_A })).resolves.toBe(confirmEmailFailure);
    expect(repository.users.get("worker-1")?.verified).toBe(false);
  });

  it("refuses a link that was already used", async () => {
    const { service } = setup();
    await service.add({ ...base, email: "new@example.test" });
    await expect(service.confirm({ token: TOKEN_A })).resolves.toEqual({ status: "confirmed" });
    await expect(service.confirm({ token: TOKEN_A })).resolves.toBe(confirmEmailFailure);
  });

  it("refuses unknown and malformed tokens", async () => {
    const { service } = setup();
    await expect(service.confirm({ token: "z".repeat(43) })).resolves.toBe(confirmEmailFailure);
    await expect(service.confirm({ token: "short" })).resolves.toBe(confirmEmailFailure);
    await expect(service.confirm({ token: "<script>".repeat(6) })).resolves.toBe(confirmEmailFailure);
  });

  it("writes the email in French and Arabic", () => {
    expect(confirmEmailMessage("a@b.test", "https://x.test/l", "fr").subject).toBe("Confirmez votre courriel Joblop");
    expect(confirmEmailMessage("a@b.test", "https://x.test/l", "ar").text).toContain("https://x.test/l");
  });
});

describe("prisma add-email adapter", () => {
  it("reports in_use when the database unique check trips", async () => {
    const prisma = {
      user: { findUnique: async () => null, update: async () => ({}) },
      userIdentity: { updateMany: async () => ({ count: 1 }) },
      emailVerificationCode: { findFirst: async () => null },
      $transaction: async () => {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
    };
    const repository = createPrismaAddEmailRepository(prisma, {
      createEmailVerificationCode: async () => {
        throw new Error("unused");
      },
      consumeEmailVerificationCode: async () => null,
      markEmailVerified: async () => null
    });
    await expect(
      repository.setUnconfirmedEmail({ userId: "u1", emailNormalized: "x@example.test", now: new Date() })
    ).resolves.toBe("in_use");
  });

  it("keeps the password identity subject in step with the new email", async () => {
    const calls: unknown[] = [];
    const tx = {
      user: { findUnique: async () => null, update: async (input: unknown) => calls.push(["user", input]) },
      userIdentity: { updateMany: async (input: unknown) => (calls.push(["identity", input]), { count: 1 }) },
      emailVerificationCode: { findFirst: async () => null }
    };
    const prisma = { ...tx, $transaction: async (work: (t: typeof tx) => Promise<unknown>) => work(tx) };
    const repository = createPrismaAddEmailRepository(prisma, {
      createEmailVerificationCode: async () => {
        throw new Error("unused");
      },
      consumeEmailVerificationCode: async () => null,
      markEmailVerified: async () => null
    });
    await expect(
      repository.setUnconfirmedEmail({ userId: "u1", emailNormalized: "x@example.test", now: new Date() })
    ).resolves.toBe("set");
    expect(calls).toEqual([
      ["user", { where: { id: "u1" }, data: { emailNormalized: "x@example.test" } }],
      ["identity", { where: { userId: "u1", provider: "local_password" }, data: { providerSubject: "x@example.test" } }]
    ]);
  });
});
