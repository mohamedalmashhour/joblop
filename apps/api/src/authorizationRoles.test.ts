import { describe, expect, it, vi } from "vitest";
import {
  activeMembershipRoleQuery,
  activePlatformGrantQuery,
  activeWorkerIdentityQuery,
  createPrismaAuthorizationRoleResolver
} from "./authorizationRoles";

function client(roles: string[], worker = false, platformRoles: string[] = []) {
  return {
    findMemberships: vi.fn(async () => [
      { membershipRoles: roles.map((key) => ({ accessRole: { key } })) }
    ]),
    findActiveWorker: vi.fn(async () => (worker ? { id: "worker-1" } : null)),
    findPlatformGrants: vi.fn(async () => platformRoles.map((key) => ({ accessRole: { key } })))
  };
}

describe("database authorization role resolution", () => {
  it("composes the deployed Prisma lookup with every active and revocation predicate", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    expect(activeMembershipRoleQuery("user-1", now)).toEqual({
      where: {
        userId: "user-1",
        status: "active",
        revokedAt: null,
        OR: [{ expiredAt: null }, { expiredAt: { gt: now } }],
        organization: { status: "active" }
      },
      select: {
        membershipRoles: {
          where: {
            revokedAt: null,
            accessRole: { status: "active" }
          },
          select: { accessRole: { select: { key: true } } }
        }
      }
    });
    expect(activeWorkerIdentityQuery("user-1")).toEqual({
      where: { userId: "user-1", status: "active" },
      select: { id: true }
    });
    expect(activePlatformGrantQuery("user-1")).toEqual({
      where: {
        userId: "user-1",
        user: { status: "active" },
        accessRole: { status: "active", scope: "platform" }
      },
      select: { accessRole: { select: { key: true } } }
    });
  });
  it("returns whitelisted active organization roles, deduplicated", async () => {
    const database = client(
      ["ORGANIZATION_ADMINISTRATOR", "ORGANIZATION_ADMINISTRATOR", "UNKNOWN"],
      false,
      ["PLATFORM_ADMINISTRATOR"]
    );
    await expect(createPrismaAuthorizationRoleResolver(database)("user-1")).resolves.toEqual([
      "PLATFORM_ADMINISTRATOR",
      "ORGANIZATION_ADMINISTRATOR"
    ]);
    expect(database.findMemberships).toHaveBeenCalledWith("user-1", expect.any(Date));
  });

  it("does not inherit platform administration from an organization membership", async () => {
    await expect(
      createPrismaAuthorizationRoleResolver(client(["PLATFORM_ADMINISTRATOR"]))("user-1")
    ).resolves.toEqual([]);
  });

  it("adds worker access only for an active identity owned by the user", async () => {
    const database = client(["WORKER_ACCESS"], true);
    await expect(createPrismaAuthorizationRoleResolver(database)("user-1")).resolves.toEqual([
      "WORKER_ACCESS"
    ]);
    expect(database.findActiveWorker).toHaveBeenCalledWith("user-1");
  });

  it("does not inherit worker access from an organization role assignment", async () => {
    await expect(
      createPrismaAuthorizationRoleResolver(client(["WORKER_ACCESS"], false))("user-1")
    ).resolves.toEqual([]);
  });

  it("fails closed when role lookup fails", async () => {
    const database = client([]);
    database.findMemberships.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(createPrismaAuthorizationRoleResolver(database)("user-1")).resolves.toEqual([]);
  });
});
