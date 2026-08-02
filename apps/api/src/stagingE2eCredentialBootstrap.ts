import { randomUUID } from "node:crypto";
import { hashPassword, normalizeEmail } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

type Credential = Readonly<{ email: string; password: string }>;
type EmployerCredential = Credential &
  Readonly<{ revokedEmail: string; revokedPassword: string }>;

const syntheticDomain = "@rwos-staging.invalid";
const exactEmployerEmail = `employer-tenant-a${syntheticDomain}`;
const exactWorkerEmail = `worker-tenant-a${syntheticDomain}`;
const exactRevokedEmail = `employer-tenant-b${syntheticDomain}`;

export function parseCredential<T extends Credential>(raw: string | undefined, kind: string): T {
  if (!raw) throw new Error(`RWOS_STAGING_E2E_${kind}_CREDENTIAL_MISSING`);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`RWOS_STAGING_E2E_${kind}_CREDENTIAL_INVALID`);
  }
  if (!value || typeof value !== "object") {
    throw new Error(`RWOS_STAGING_E2E_${kind}_CREDENTIAL_INVALID`);
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.email !== "string" ||
    typeof candidate.password !== "string" ||
    !normalizeEmail(candidate.email).endsWith(syntheticDomain) ||
    candidate.password.length < 12
  ) {
    throw new Error(`RWOS_STAGING_E2E_${kind}_CREDENTIAL_INVALID`);
  }
  return value as T;
}

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

async function main() {
  assertBootstrapBoundary({
    environment: process.env.RWOS_ENV,
    releaseSha: process.env.RWOS_RELEASE_SHA,
    approvalReference: process.env.RWOS_E2E_CREDENTIAL_APPROVAL_REFERENCE
  });
  const employer = parseCredential<EmployerCredential>(
    process.env.RWOS_E2E_EMPLOYER_CREDENTIAL,
    "EMPLOYER"
  );
  const admin = parseCredential<Credential>(process.env.RWOS_E2E_ADMIN_CREDENTIAL, "ADMIN");
  const worker = parseCredential<Credential>(process.env.RWOS_E2E_WORKER_CREDENTIAL, "WORKER");
  if (
    normalizeEmail(employer.email) !== exactEmployerEmail ||
    normalizeEmail(employer.revokedEmail) !== exactRevokedEmail ||
    typeof employer.revokedPassword !== "string" ||
    employer.revokedPassword.length < 12 ||
    normalizeEmail(worker.email) !== exactWorkerEmail
  ) {
    throw new Error("RWOS_STAGING_E2E_SYNTHETIC_IDENTITY_MISMATCH");
  }

  const prisma = createPrismaClient(process.env.DATABASE_URL);
  try {
    const now = new Date();
    const credentials = [
      { email: exactEmployerEmail, password: employer.password, role: "employer" },
      { email: exactWorkerEmail, password: worker.password, role: "worker" },
      { email: exactRevokedEmail, password: employer.revokedPassword, role: "revoked" },
      { email: normalizeEmail(admin.email), password: admin.password, role: "admin" }
    ] as const;
    const hashes = await Promise.all(
      credentials.map(async (credential) => ({
        ...credential,
        passwordHash: await hashPassword(credential.password)
      }))
    );

    await prisma.$transaction(async (transaction) => {
      for (const credential of hashes) {
        const user = await transaction.user.findUnique({
          where: { emailNormalized: credential.email },
          include: {
            platformAccessGrants: { include: { accessRole: true } }
          }
        });
        if (!user || !user.emailNormalized.endsWith(syntheticDomain)) {
          throw new Error("RWOS_STAGING_E2E_SYNTHETIC_USER_MISSING");
        }
        if (
          credential.role === "admin" &&
          !user.platformAccessGrants.some(
            ({ accessRole }) => accessRole.key === "PLATFORM_ADMINISTRATOR"
          )
        ) {
          throw new Error("RWOS_STAGING_E2E_ADMIN_ROLE_MISSING");
        }
        await transaction.userIdentity.upsert({
          where: {
            provider_providerSubject: {
              provider: "local_password",
              providerSubject: credential.email
            }
          },
          create: {
            userId: user.id,
            provider: "local_password",
            providerSubject: credential.email,
            emailVerifiedAt: now,
            passwordHash: credential.passwordHash,
            passwordUpdatedAt: now
          },
          update: {
            userId: user.id,
            emailVerifiedAt: now,
            passwordHash: credential.passwordHash,
            passwordUpdatedAt: now
          }
        });
        await transaction.session.updateMany({
          where: { userId: user.id, status: "active" },
          data: { status: "revoked", revokedAt: now }
        });
      }
      const actor = await transaction.auditActorReference.create({
        data: { actorType: "system", displayLabel: "Staging synthetic E2E credential bootstrap" }
      });
      await transaction.auditEvent.create({
        data: {
          actorReferenceId: actor.id,
          entityType: "authentication",
          entityId: "00000000-0000-0000-0000-000000000000",
          action: "authentication.password_reset_completed",
          newState: "synthetic_e2e_credentials_rotated",
          reason: `release=${process.env.RWOS_RELEASE_SHA}`,
          source: "system",
          correlationId: `staging_e2e_${randomUUID()}`,
          policyVersion: "staging-e2e-credential-bootstrap-v1",
          createdAt: now
        }
      });
    });
    process.stdout.write("STAGING_E2E_CREDENTIAL_BOOTSTRAP_SUCCEEDED\n");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("stagingE2eCredentialBootstrap.ts")) {
  await main();
}
