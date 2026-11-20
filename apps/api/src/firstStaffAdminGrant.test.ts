import { describe, expect, it, vi } from "vitest";
import { grantFirstStaffAdmin } from "./firstStaffAdminGrant";

const input = { email: " Owner@Example.com ", environment: "test", releaseSha: "a".repeat(40), now: new Date("2026-11-07T00:00:00Z") };

function fakePrisma(overrides: { grant?: unknown; role?: unknown; user?: unknown } = {}) {
  const transaction = {
    $executeRaw: vi.fn(async () => 1),
    platformAccessGrant: { findFirst: vi.fn(async () => overrides.grant ?? null), create: vi.fn(async () => ({})) },
    accessRoleDefinition: {
      findUnique: vi.fn(async () => ("role" in overrides ? overrides.role : { id: "r", scope: "platform", status: "active" }))
    },
    user: { findUnique: vi.fn(async () => ("user" in overrides ? overrides.user : { id: "u", status: "active" })) },
    auditActorReference: { create: vi.fn(async () => ({ id: "a" })) },
    auditEvent: { create: vi.fn(async () => ({})) }
  };
  return { transaction, prisma: { $transaction: async (work: (t: typeof transaction) => unknown) => work(transaction) } };
}

describe("grantFirstStaffAdmin", () => {
  it("grants the existing account and records it", async () => {
    const { prisma, transaction } = fakePrisma();
    expect(await grantFirstStaffAdmin(prisma, input)).toBe("granted");
    expect(transaction.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { emailNormalized: "owner@example.com" } }));
    expect(transaction.platformAccessGrant.create).toHaveBeenCalledTimes(1);
    expect(transaction.auditEvent.create).toHaveBeenCalledTimes(1);
  });

  it("never runs in production", async () => {
    const { prisma, transaction } = fakePrisma();
    expect(await grantFirstStaffAdmin(prisma, { ...input, environment: "production" })).toBe("production_refused");
    expect(transaction.platformAccessGrant.create).not.toHaveBeenCalled();
  });

  it("works only once", async () => {
    const { prisma, transaction } = fakePrisma({ grant: { userId: "someone" } });
    expect(await grantFirstStaffAdmin(prisma, input)).toBe("admin_exists");
    expect(transaction.platformAccessGrant.create).not.toHaveBeenCalled();
  });

  it("creates no account", async () => {
    const { prisma, transaction } = fakePrisma({ user: null });
    expect(await grantFirstStaffAdmin(prisma, input)).toBe("account_not_found");
    expect(transaction.platformAccessGrant.create).not.toHaveBeenCalled();
  });

  it("refuses a disabled account, a missing role and a bad release", async () => {
    expect(await grantFirstStaffAdmin(fakePrisma({ user: { id: "u", status: "disabled" } }).prisma, input)).toBe("account_not_active");
    expect(await grantFirstStaffAdmin(fakePrisma({ role: null }).prisma, input)).toBe("role_missing");
    expect(await grantFirstStaffAdmin(fakePrisma().prisma, { ...input, releaseSha: "x" })).toBe("invalid_release");
  });
});
