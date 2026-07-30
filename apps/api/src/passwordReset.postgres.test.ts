import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@rwos/database";
import { hashPassword, verifyPassword } from "@rwos/auth";
import { createPrismaPasswordResetRepository } from "./passwordResetRepository";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("RWOS_TEST_DATABASE_URL is required.");
const prisma = createPrismaClient(databaseUrl);

describe("password reset PostgreSQL transaction", () => {
  it("consumes once, updates the local identity, revokes sessions, and audits atomically", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const now = new Date("2026-07-30T16:00:00.000Z");
    const user = await prisma.user.create({
      data: {
        publicId: `usr_reset_${suffix}`,
        emailNormalized: `reset-${suffix}@example.test`,
        status: "active",
        identities: {
          create: {
            provider: "local_password",
            providerSubject: `reset-${suffix}@example.test`,
            passwordHash: await hashPassword("OriginalPassword123"),
            passwordUpdatedAt: new Date("2026-07-30T15:00:00.000Z")
          }
        }
      }
    });
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionHash: suffix.padEnd(64, "0").slice(0, 64),
        expiresAt: new Date("2026-07-31T16:00:00.000Z")
      }
    });
    const repository = createPrismaPasswordResetRepository(prisma);
    await repository.createToken({
      userId: user.id,
      tokenHash: suffix.padEnd(64, "a").slice(0, 64),
      expiresAt: new Date("2026-07-30T16:30:00.000Z"),
      now
    });
    const replacementHash = await hashPassword("ReplacementPassword123");

    await expect(
      repository.complete({
        tokenHash: suffix.padEnd(64, "a").slice(0, 64),
        passwordHash: replacementHash,
        now: new Date("2026-07-30T16:05:00.000Z")
      })
    ).resolves.toEqual({ userId: user.id });
    await expect(
      repository.complete({
        tokenHash: suffix.padEnd(64, "a").slice(0, 64),
        passwordHash: replacementHash,
        now: new Date("2026-07-30T16:06:00.000Z")
      })
    ).resolves.toBeNull();

    const identity = await prisma.userIdentity.findFirstOrThrow({ where: { userId: user.id } });
    expect(await verifyPassword("ReplacementPassword123", identity.passwordHash)).toBe(true);
    expect(await prisma.session.count({ where: { userId: user.id, status: "active" } })).toBe(0);
    expect(
      await prisma.auditEvent.count({
        where: { entityId: user.id, action: "auth.password_reset_completed" }
      })
    ).toBe(1);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
