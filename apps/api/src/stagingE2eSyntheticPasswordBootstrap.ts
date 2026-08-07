import { randomUUID } from "node:crypto";
import { hashPassword, normalizeEmail } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

// Focused staging-only bootstrap that gives the two synthetic sign-in users materialized by the
// QA-reset `prepare` step a usable `local_password` identity. QA-reset intentionally materializes
// synthetic users with only a passwordless `dev_test` identity (password_hash NULL), so without
// this step the authenticated browser E2E cannot sign in (POST /api/session/sign-in -> 401).
//
// Scope is deliberately narrow: only `employer-tenant-a` and `worker-tenant-a` — the two users the
// authenticated-surfaces E2E signs in as and expects a 200 from. The persistent platform admin is
// provisioned separately (firstAdminBootstrap) and the revoked user (employer-tenant-b) must stay
// unauthenticatable, so neither is touched here.

const syntheticDomain = "@rwos-staging.invalid";
const passwordProvider = "local_password";

export const syntheticSignInUsers = [
  { role: "employer", email: `employer-tenant-a${syntheticDomain}`, passwordEnv: "RWOS_E2E_EMPLOYER_PASSWORD" },
  { role: "worker", email: `worker-tenant-a${syntheticDomain}`, passwordEnv: "RWOS_E2E_WORKER_PASSWORD" }
] as const;

export type SyntheticSignInCredential = Readonly<{ role: string; email: string; password: string }>;

export function assertBootstrapBoundary(input: {
  environment: string | undefined;
  releaseSha: string | undefined;
  approvalReference: string | undefined;
}) {
  if (input.environment !== "staging") throw new Error("RWOS_STAGING_E2E_ENVIRONMENT_DENIED");
  if (!/^[a-f0-9]{40}$/u.test(input.releaseSha ?? "")) {
    throw new Error("RWOS_STAGING_E2E_RELEASE_SHA_INVALID");
  }
  if ((input.approvalReference?.trim().length ?? 0) < 12) {
    throw new Error("RWOS_STAGING_E2E_APPROVAL_MISSING");
  }
}

export function resolveSyntheticCredentials(
  env: NodeJS.ProcessEnv
): readonly SyntheticSignInCredential[] {
  return syntheticSignInUsers.map(({ role, email, passwordEnv }) => {
    const password = env[passwordEnv];
    if (typeof password !== "string" || password.length < 12) {
      throw new Error(`RWOS_STAGING_E2E_${role.toUpperCase()}_PASSWORD_INVALID`);
    }
    if (!email.endsWith(syntheticDomain)) {
      throw new Error(`RWOS_STAGING_E2E_${role.toUpperCase()}_IDENTITY_MISMATCH`);
    }
    return { role, email: normalizeEmail(email), password };
  });
}

type MinimalPrisma = Pick<ReturnType<typeof createPrismaClient>, "$transaction" | "$disconnect">;

export async function bootstrapSyntheticPasswords(
  prisma: MinimalPrisma,
  credentials: readonly SyntheticSignInCredential[],
  context: Readonly<{ releaseSha: string; now: Date }>
): Promise<number> {
  const hashed = await Promise.all(
    credentials.map(async (credential) => ({
      ...credential,
      passwordHash: await hashPassword(credential.password)
    }))
  );

  return prisma.$transaction(async (transaction) => {
    let updated = 0;
    for (const credential of hashed) {
      const user = await transaction.user.findUnique({
        where: { emailNormalized: credential.email }
      });
      if (!user || !user.emailNormalized.endsWith(syntheticDomain)) {
        throw new Error("RWOS_STAGING_E2E_SYNTHETIC_USER_MISSING");
      }
      await transaction.userIdentity.upsert({
        where: {
          provider_providerSubject: {
            provider: passwordProvider,
            providerSubject: credential.email
          }
        },
        create: {
          userId: user.id,
          provider: passwordProvider,
          providerSubject: credential.email,
          emailVerifiedAt: context.now,
          passwordHash: credential.passwordHash,
          passwordUpdatedAt: context.now
        },
        update: {
          userId: user.id,
          emailVerifiedAt: context.now,
          passwordHash: credential.passwordHash,
          passwordUpdatedAt: context.now
        }
      });
      updated += 1;
    }
    const actor = await transaction.auditActorReference.create({
      data: { actorType: "system", displayLabel: "Staging synthetic E2E password bootstrap" }
    });
    await transaction.auditEvent.create({
      data: {
        actorReferenceId: actor.id,
        entityType: "authentication",
        entityId: "00000000-0000-0000-0000-000000000000",
        action: "authentication.password_reset_completed",
        newState: "synthetic_e2e_sign_in_passwords_set",
        reason: `release=${context.releaseSha}`,
        source: "system",
        correlationId: `staging_e2e_password_${randomUUID()}`,
        policyVersion: "staging-e2e-synthetic-password-bootstrap-v1",
        createdAt: context.now
      }
    });
    return updated;
  });
}

async function main() {
  assertBootstrapBoundary({
    environment: process.env.RWOS_ENV,
    releaseSha: process.env.RWOS_RELEASE_SHA,
    approvalReference: process.env.RWOS_E2E_CREDENTIAL_APPROVAL_REFERENCE
  });
  const credentials = resolveSyntheticCredentials(process.env);
  const prisma = createPrismaClient(process.env.DATABASE_URL);
  try {
    const updated = await bootstrapSyntheticPasswords(prisma, credentials, {
      releaseSha: process.env.RWOS_RELEASE_SHA as string,
      now: new Date()
    });
    process.stdout.write(`STAGING_E2E_SYNTHETIC_PASSWORD_BOOTSTRAP_SUCCEEDED updated=${updated}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("stagingE2eSyntheticPasswordBootstrap.ts")) {
  await main();
}
