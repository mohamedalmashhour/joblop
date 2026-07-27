import { authorizationRoleKeys, type AuthorizationRoleKey } from "@rwos/auth";

type AuthorizationRoleSource = {
  findMemberships(
    userId: string,
    now: Date
  ): Promise<
    readonly {
      membershipRoles: readonly { accessRole: { key: string } }[];
    }[]
  >;
  findActiveWorker(userId: string): Promise<{ id: string } | null>;
};

export function createPrismaAuthorizationRoleResolver(source: AuthorizationRoleSource) {
  return async (userId: string): Promise<readonly AuthorizationRoleKey[]> => {
    try {
      const now = new Date();
      const [memberships, workerIdentity] = await Promise.all([
        source.findMemberships(userId, now),
        source.findActiveWorker(userId)
      ]);
      const allowed = new Set<string>(authorizationRoleKeys);
      const roles = memberships
        .flatMap((membership) => membership.membershipRoles.map(({ accessRole }) => accessRole.key))
        .filter((role) => role !== "WORKER_ACCESS");
      if (workerIdentity) roles.push("WORKER_ACCESS");
      return [...new Set(roles)].filter((role): role is AuthorizationRoleKey => allowed.has(role));
    } catch {
      return [];
    }
  };
}

export function activeMembershipRoleQuery(userId: string, now: Date) {
  return {
    where: {
      userId,
      status: "active" as const,
      revokedAt: null,
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }],
      organization: { status: "active" as const }
    },
    select: {
      membershipRoles: {
        where: {
          revokedAt: null,
          accessRole: { status: "active" as const }
        },
        select: { accessRole: { select: { key: true } } }
      }
    }
  };
}

export function activeWorkerIdentityQuery(userId: string) {
  return {
    where: { userId, status: "active" as const },
    select: { id: true }
  };
}
