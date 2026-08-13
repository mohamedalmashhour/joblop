// LOCAL TEST ONLY — NOT ACCEPTABLE AS PRODUCTION/STAGING CERTIFICATION.
//
// Workstream A.1 local disposable browser-E2E seeder. It creates SYNTHETIC identities with a known
// synthetic password so the REAL sign-in flow (/auth/sign-in via each app's /api/session/sign-in)
// authenticates them — there is NO auth backdoor and NO authorization-middleware bypass. The seam is
// a plain Prisma seed gated by an explicit local-E2E flag that FAILS CLOSED outside local-E2E mode
// and is impossible to run in production (proven by seed.test.ts).
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@rwos/database";
import { hashPassword, normalizeEmail } from "@rwos/auth";

// Synthetic-only. No real names/emails/phones/PII. `.invalid` TLD can never resolve.
export const LOCAL_E2E_PASSWORD = "Local-E2E-Synthetic-Pass1";
export const LOCAL_E2E_RELEASE_SHA = "0".repeat(40); // value is ignored by the role resolver
export const LOCAL_E2E_USERS = {
  platformAdmin: "platform-admin@local-e2e.invalid",
  payrollAdmin: "payroll-admin@local-e2e.invalid",
  employerA: "employer-a@local-e2e.invalid",
  employerB: "employer-b@local-e2e.invalid",
  workerA: "worker-a@local-e2e.invalid",
  workerB: "worker-b@local-e2e.invalid",
  revoked: "revoked@local-e2e.invalid"
} as const;

// FAIL-CLOSED guard. Local-E2E seeding is impossible unless explicitly enabled AND the runtime env
// is local|test — it can NEVER run in staging or production (not just production).
export function assertLocalE2eEnabled(env: NodeJS.ProcessEnv): void {
  const rwosEnv = env.RWOS_ENV ?? "local";
  if (rwosEnv !== "local" && rwosEnv !== "test") {
    throw new Error("LOCAL_E2E_ONLY_LOCAL_OR_TEST");
  }
  if (env.RWOS_LOCAL_E2E !== "enabled") {
    throw new Error("LOCAL_E2E_NOT_ENABLED");
  }
}

export type LocalE2eSeedResult = Readonly<{ orgAId: string; orgBId: string; workerAId: string; workerBId: string; payrollPeriodId: string; payrollCalculationId: string }>;

export async function seedLocalE2e(databaseUrl: string, env: NodeJS.ProcessEnv = process.env): Promise<LocalE2eSeedResult> {
  assertLocalE2eEnabled(env);
  const prisma = createPrismaClient(databaseUrl);
  try {
    const passwordHash = await hashPassword(LOCAL_E2E_PASSWORD);
    const now = new Date();

    const platformRole = await prisma.accessRoleDefinition.create({ data: { key: "PLATFORM_ADMINISTRATOR", scope: "platform", status: "active", description: "local-e2e" } });
    const payrollRole = await prisma.accessRoleDefinition.create({ data: { key: "PAYROLL_ADMINISTRATOR", scope: "platform", status: "active", description: "local-e2e" } });
    const ownerRole = await prisma.accessRoleDefinition.create({ data: { key: "ORGANIZATION_OWNER", scope: "organization", status: "active", description: "local-e2e" } });

    const mkUser = (email: string, status: "active" | "disabled" = "active") =>
      prisma.user.create({
        data: {
          publicId: `usr_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
          emailNormalized: normalizeEmail(email),
          displayName: "E2E Synthetic",
          status,
          identities: { create: { provider: "local_password", providerSubject: normalizeEmail(email), passwordHash, passwordUpdatedAt: now, emailVerifiedAt: now } }
        }
      });

    const platformAdmin = await mkUser(LOCAL_E2E_USERS.platformAdmin);
    await prisma.platformAccessGrant.create({ data: { userId: platformAdmin.id, accessRoleDefinitionId: platformRole.id, releaseSha: LOCAL_E2E_RELEASE_SHA, grantedAt: now } });

    const payrollAdmin = await mkUser(LOCAL_E2E_USERS.payrollAdmin);
    await prisma.platformAccessGrant.create({ data: { userId: payrollAdmin.id, accessRoleDefinitionId: payrollRole.id, releaseSha: LOCAL_E2E_RELEASE_SHA, grantedAt: now } });

    const orgA = await prisma.employerOrganization.create({ data: { publicId: `ORG-A-${randomUUID().slice(0, 8)}`, legalName: "Org A Legal", displayName: "Org A", status: "active", createdByUserId: platformAdmin.id } });
    const orgB = await prisma.employerOrganization.create({ data: { publicId: `ORG-B-${randomUUID().slice(0, 8)}`, legalName: "Org B Legal", displayName: "Org B", status: "active", createdByUserId: platformAdmin.id } });

    const employerA = await mkUser(LOCAL_E2E_USERS.employerA);
    const memA = await prisma.organizationMembership.create({ data: { organizationId: orgA.id, userId: employerA.id, status: "active", acceptedAt: now } });
    await prisma.membershipAccessRole.create({ data: { membershipId: memA.id, accessRoleDefinitionId: ownerRole.id } });

    const employerB = await mkUser(LOCAL_E2E_USERS.employerB);
    const memB = await prisma.organizationMembership.create({ data: { organizationId: orgB.id, userId: employerB.id, status: "active", acceptedAt: now } });
    await prisma.membershipAccessRole.create({ data: { membershipId: memB.id, accessRoleDefinitionId: ownerRole.id } });

    const workerA = await mkUser(LOCAL_E2E_USERS.workerA);
    const workerAIdentity = await prisma.workerIdentity.create({ data: { userId: workerA.id, displayName: "Worker A", status: "active" } });
    const workerB = await mkUser(LOCAL_E2E_USERS.workerB);
    const workerBIdentity = await prisma.workerIdentity.create({ data: { userId: workerB.id, displayName: "Worker B", status: "active" } });

    // Revoked/disabled user — the real sign-in must deny it generically.
    await mkUser(LOCAL_E2E_USERS.revoked, "disabled");

    // A governed payroll calculation for Worker A in Org A so the admin payroll journey renders a
    // real calculation + the HR-6.1 advisory panel. Seeded directly (synthetic, TEST — no money).
    const period = await prisma.payrollPeriod.create({ data: { organizationId: orgA.id, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: new Date("2026-08-01T00:00:00Z"), periodEnd: new Date("2026-09-01T00:00:00Z"), timezone: "America/Toronto", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", createdByUserId: platformAdmin.id } });
    const calc = await prisma.payrollCalculation.create({ data: { payrollPeriodId: period.id, organizationId: orgA.id, workerIdentityId: workerAIdentity.id, revision: 1, status: "calculated", jurisdictionCountry: "CA", jurisdictionRegion: "QC", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", calculationPolicyVersion: "hr5.1", currency: "CAD", grossPayMinor: 25440, totalDeductionsMinor: 8903, netPayMinor: 16537, totalEmployerCostMinor: 3561, calculatedAt: new Date("2026-08-12T00:00:00Z"), createdByUserId: platformAdmin.id, calculationFingerprint: `fp-${randomUUID().slice(0, 12)}` } });
    await prisma.payrollCalculation.update({ where: { id: calc.id }, data: { familyRootId: calc.id } });
    await prisma.payrollEarningLine.create({ data: { payrollCalculationId: calc.id, classification: "regular", description: "Regular", amountMinor: 25440, currency: "CAD" } });
    await prisma.payrollWorkedTimeReference.create({ data: { payrollCalculationId: calc.id, timesheetId: randomUUID(), timesheetVersion: 1, timesheetStatus: "approved", payableMinutes: 480, billableMinutes: 480, scheduledStartAt: new Date("2026-08-05T13:00:00Z"), scheduledEndAt: new Date("2026-08-05T21:00:00Z"), assignmentId: randomUUID(), workGroupId: randomUUID(), roleDefinitionId: randomUUID(), residenceId: randomUUID(), contractId: randomUUID(), contractVersion: "v1", contractEffectiveFrom: new Date("2026-07-01T00:00:00Z"), appliedHourlyRateMinor: 3000, currency: "CAD", sourceEffectiveInstant: new Date("2026-08-05T13:00:00Z") } });

    return { orgAId: orgA.id, orgBId: orgB.id, workerAId: workerAIdentity.id, workerBId: workerBIdentity.id, payrollPeriodId: period.id, payrollCalculationId: calc.id };
  } finally {
    await prisma.$disconnect();
  }
}
