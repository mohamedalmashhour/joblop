import { createHash, timingSafeEqual } from "node:crypto";
import { hashPassword, normalizeEmail } from "@rwos/auth";

const bootstrapKey = "first-platform-admin";
const nilEntityId = "00000000-0000-0000-0000-000000000000";

export type FirstAdminBootstrapOutcome =
  "created" | "disabled" | "invalid" | "expired" | "already_completed" | "admin_exists";

export interface FirstAdminBootstrapRepository {
  attemptAtomic(
    input: Readonly<{
      key: string;
      secretDigest: string;
      expiresAt: Date;
      emailNormalized: string;
      displayName: string;
      passwordHash: string;
      environment: "staging";
      releaseSha: string;
      now: Date;
      correlationId: string;
    }>
  ): Promise<
    Readonly<
      { outcome: "created"; userId: string } | { outcome: "already_completed" | "admin_exists" }
    >
  >;
  recordOutcome(
    input: Readonly<{
      outcome: Exclude<FirstAdminBootstrapOutcome, "created">;
      environment: string;
      releaseSha: string;
      now: Date;
      correlationId: string;
    }>
  ): Promise<void>;
}

export type FirstAdminBootstrapConfig = Readonly<{
  enabled: boolean;
  environment: string;
  releaseSha: string;
  configuredSecret: string | undefined;
  expiresAt: Date | null;
}>;

export function createFirstAdminBootstrapService(
  repository: FirstAdminBootstrapRepository,
  config: FirstAdminBootstrapConfig,
  options: Readonly<{ now?: () => Date }> = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async bootstrap(
      input: Readonly<{
        presentedSecret: string | undefined;
        email: string;
        displayName: string;
        password: string;
        correlationId: string;
      }>
    ) {
      const currentTime = now();
      const baseAudit = {
        environment: config.environment,
        releaseSha: config.releaseSha,
        now: currentTime,
        correlationId: input.correlationId
      };

      if (!config.enabled || config.environment !== "staging") {
        await repository.recordOutcome({ ...baseAudit, outcome: "disabled" });
        return { outcome: "disabled" as const };
      }
      if (
        !/^[0-9a-f]{40}$/.test(config.releaseSha) ||
        !config.configuredSecret ||
        config.configuredSecret.length < 32 ||
        !input.presentedSecret ||
        !secureEqual(input.presentedSecret, config.configuredSecret)
      ) {
        await repository.recordOutcome({ ...baseAudit, outcome: "invalid" });
        return { outcome: "invalid" as const };
      }
      if (!config.expiresAt || config.expiresAt.getTime() <= currentTime.getTime()) {
        await repository.recordOutcome({ ...baseAudit, outcome: "expired" });
        return { outcome: "expired" as const };
      }

      const emailNormalized = normalizeEmail(input.email);
      const passwordHash = await hashPassword(input.password);
      return repository.attemptAtomic({
        key: bootstrapKey,
        secretDigest: digestSecret(config.configuredSecret),
        expiresAt: config.expiresAt,
        emailNormalized,
        displayName: input.displayName.trim(),
        passwordHash,
        environment: "staging",
        releaseSha: config.releaseSha,
        now: currentTime,
        correlationId: input.correlationId
      });
    }
  };
}

export function createPrismaFirstAdminBootstrapRepository(
  prismaClient: unknown
): FirstAdminBootstrapRepository {
  const prisma = prismaClient as PrismaBootstrapClient;
  return {
    attemptAtomic(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('rwos:first-platform-admin', 0))`;
        const existingGrant = await transaction.platformAccessGrant.findFirst({
          where: { accessRole: { key: "PLATFORM_ADMINISTRATOR" } },
          select: { userId: true }
        });
        if (existingGrant) return { outcome: "admin_exists" as const };
        const prior = await transaction.initialAdminBootstrap.findUnique({
          where: { key: input.key },
          select: { usedAt: true, secretDigest: true }
        });
        if (prior?.usedAt || (prior && prior.secretDigest !== input.secretDigest)) {
          return { outcome: "already_completed" as const };
        }
        const role = await transaction.accessRoleDefinition.findUnique({
          where: { key: "PLATFORM_ADMINISTRATOR" },
          select: { id: true, scope: true, status: true }
        });
        if (!role || role.scope !== "platform" || role.status !== "active") {
          return { outcome: "admin_exists" as const };
        }
        const user = await transaction.user.create({
          data: {
            publicId: `usr_bootstrap_${input.releaseSha.slice(0, 12)}`,
            emailNormalized: input.emailNormalized,
            displayName: input.displayName,
            status: "email_verification_pending",
            identities: {
              create: {
                provider: "local_password",
                providerSubject: input.emailNormalized,
                passwordHash: input.passwordHash,
                passwordUpdatedAt: input.now,
                mfaState: "required"
              }
            }
          },
          select: { id: true }
        });
        await transaction.platformAccessGrant.create({
          data: {
            userId: user.id,
            accessRoleDefinitionId: role.id,
            releaseSha: input.releaseSha,
            grantedAt: input.now
          }
        });
        await transaction.initialAdminBootstrap.upsert({
          where: { key: input.key },
          create: {
            key: input.key,
            secretDigest: input.secretDigest,
            expiresAt: input.expiresAt,
            usedAt: input.now,
            createdUserId: user.id,
            environment: input.environment,
            releaseSha: input.releaseSha,
            outcome: "created",
            createdAt: input.now,
            updatedAt: input.now
          },
          update: {
            usedAt: input.now,
            createdUserId: user.id,
            outcome: "created",
            updatedAt: input.now
          }
        });
        await recordAudit(transaction, {
          outcome: "created",
          environment: input.environment,
          releaseSha: input.releaseSha,
          now: input.now,
          correlationId: input.correlationId,
          userId: user.id
        });
        return { outcome: "created" as const, userId: user.id };
      });
    },
    async recordOutcome(input) {
      await recordAudit(prisma, { ...input, userId: null });
    }
  };
}

function digestSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function secureEqual(left: string, right: string) {
  const leftDigest = Buffer.from(digestSecret(left), "hex");
  const rightDigest = Buffer.from(digestSecret(right), "hex");
  return timingSafeEqual(leftDigest, rightDigest);
}

async function recordAudit(
  client: Pick<PrismaBootstrapTransaction, "auditActorReference" | "auditEvent">,
  input: Readonly<{
    outcome: FirstAdminBootstrapOutcome;
    environment: string;
    releaseSha: string;
    now: Date;
    correlationId: string;
    userId: string | null;
  }>
) {
  const actor = await client.auditActorReference.create({
    data: {
      actorType: "system",
      displayLabel: "Initial platform administrator bootstrap"
    }
  });
  await client.auditEvent.create({
    data: {
      actorReferenceId: actor.id,
      entityType: "platform_admin_bootstrap",
      entityId: input.userId ?? nilEntityId,
      entityPublicReference: null,
      action: "platform_admin.bootstrap",
      priorState: null,
      newState: input.outcome,
      reason: `environment=${input.environment};release=${input.releaseSha}`,
      source: "system",
      correlationId: input.correlationId,
      policyVersion: "first-admin-bootstrap-v1",
      createdAt: input.now
    }
  });
}

type PrismaBootstrapTransaction = {
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  platformAccessGrant: {
    findFirst(args: unknown): Promise<{ userId: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
  initialAdminBootstrap: {
    findUnique(args: unknown): Promise<{ usedAt: Date | null; secretDigest: string } | null>;
    upsert(args: unknown): Promise<unknown>;
  };
  accessRoleDefinition: {
    findUnique(args: unknown): Promise<{ id: string; scope: string; status: string } | null>;
  };
  user: {
    create(args: unknown): Promise<{ id: string }>;
  };
  auditActorReference: {
    create(args: unknown): Promise<{ id: string }>;
  };
  auditEvent: {
    create(args: unknown): Promise<unknown>;
  };
};

type PrismaBootstrapClient = PrismaBootstrapTransaction & {
  $transaction<T>(work: (transaction: PrismaBootstrapTransaction) => Promise<T>): Promise<T>;
};
