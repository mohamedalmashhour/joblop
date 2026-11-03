import type { PasswordResetRepository } from "./passwordReset";

type PasswordResetPrisma = {
  user: {
    findUnique(input: {
      where: { emailNormalized: string };
      select: { id: true; publicId: true; status: true; phone: true };
    }): Promise<{ id: string; publicId: string; status: string; phone: string | null } | null>;
  };
  passwordResetToken: {
    updateMany(input: {
      where: { userId: string; consumedAt: null };
      data: { consumedAt: Date };
    }): Promise<unknown>;
    create(input: {
      data: { userId: string; tokenHash: string; expiresAt: Date; createdAt: Date };
    }): Promise<unknown>;
    findUnique(input: {
      where: { tokenHash: string };
    }): Promise<{
      id: string;
      userId: string;
      expiresAt: Date;
      consumedAt: Date | null;
    } | null>;
    updateMany(input: {
      where: { id: string; consumedAt: null; expiresAt: { gt: Date } };
      data: { consumedAt: Date };
    }): Promise<{ count: number }>;
  };
  userIdentity: {
    updateMany(input: {
      where: { userId: string; provider: "local_password" };
      data: { passwordHash: string; passwordUpdatedAt: Date };
    }): Promise<{ count: number }>;
  };
  session: {
    updateMany(input: {
      where: { userId: string; status: "active" };
      data: { status: "revoked"; revokedAt: Date; lastSeenAt: Date };
    }): Promise<unknown>;
  };
  auditActorReference: {
    create(input: {
      data: { actorType: "user" | "system"; userId?: string; displayLabel: string };
    }): Promise<{ id: string }>;
  };
  auditEvent: {
    create(input: {
      data: {
        actorReferenceId: string;
        entityType: "authentication";
        entityId: string;
        entityPublicReference: string | null;
        action: string;
        priorState: string | null;
        newState: string | null;
        reason: string | null;
        source: "api";
        correlationId: string;
        policyVersion: string;
        createdAt: Date;
      };
    }): Promise<unknown>;
  };
  $transaction<T>(work: (transaction: PasswordResetPrisma) => Promise<T>): Promise<T>;
};

export function createPrismaPasswordResetRepository(prismaClient: unknown): PasswordResetRepository {
  const prisma = prismaClient as PasswordResetPrisma;
  return {
    async findEligibleUser(emailNormalized) {
      const user = await prisma.user.findUnique({
        where: { emailNormalized },
        select: { id: true, publicId: true, status: true, phone: true }
      });
      if (!user || user.status === "disabled" || user.status === "closed") return null;
      return { id: user.id, publicId: user.publicId, phone: user.phone };
    },

    createToken(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.passwordResetToken.updateMany({
          where: { userId: input.userId, consumedAt: null },
          data: { consumedAt: input.now }
        });
        await transaction.passwordResetToken.create({
          data: {
            userId: input.userId,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            createdAt: input.now
          }
        });
      });
    },

    complete(input) {
      return prisma.$transaction(async (transaction) => {
        const token = await transaction.passwordResetToken.findUnique({
          where: { tokenHash: input.tokenHash }
        });
        if (!token || token.consumedAt || token.expiresAt.getTime() <= input.now.getTime()) return null;
        const consumed = await transaction.passwordResetToken.updateMany({
          where: { id: token.id, consumedAt: null, expiresAt: { gt: input.now } },
          data: { consumedAt: input.now }
        });
        if (consumed.count !== 1) return null;
        const identities = await transaction.userIdentity.updateMany({
          where: { userId: token.userId, provider: "local_password" },
          data: { passwordHash: input.passwordHash, passwordUpdatedAt: input.now }
        });
        if (identities.count !== 1) throw new Error("Local password identity unavailable.");
        await transaction.session.updateMany({
          where: { userId: token.userId, status: "active" },
          data: { status: "revoked", revokedAt: input.now, lastSeenAt: input.now }
        });
        const actor = await transaction.auditActorReference.create({
          data: { actorType: "user", userId: token.userId, displayLabel: "Password reset user" }
        });
        await transaction.auditEvent.create({
          data: {
            actorReferenceId: actor.id,
            entityType: "authentication",
            entityId: token.userId,
            entityPublicReference: null,
            action: "auth.password_reset_completed",
            priorState: "password_active",
            newState: "password_reset",
            reason: "user_requested_reset",
            source: "api",
            correlationId: `password_reset_${token.id}`,
            policyVersion: "auth-recovery-v1",
            createdAt: input.now
          }
        });
        return { userId: token.userId };
      });
    },

    async recordRequest(input) {
      const actor = await prisma.auditActorReference.create({
        data: { actorType: "user", userId: input.userId, displayLabel: "Password reset user" }
      });
      await prisma.auditEvent.create({
        data: {
          actorReferenceId: actor.id,
          entityType: "authentication",
          entityId: input.userId,
          entityPublicReference: input.publicId,
          action: "auth.password_reset_requested",
          priorState: null,
          newState: "reset_requested",
          reason: null,
          source: "api",
          correlationId: `password_reset_request_${input.userId}_${input.now.getTime()}`,
          policyVersion: "auth-recovery-v1",
          createdAt: input.now
        }
      });
    }
  };
}
