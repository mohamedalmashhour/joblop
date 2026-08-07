import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import {
  assertBootstrapBoundary,
  bootstrapSyntheticPasswords,
  resolveSyntheticCredentials,
  syntheticSignInUsers
} from "./stagingE2eSyntheticPasswordBootstrap";

describe("staging E2E synthetic password bootstrap boundary", () => {
  it("accepts only a staging approval bound to a full release SHA", () => {
    expect(() =>
      assertBootstrapBoundary({
        environment: "staging",
        releaseSha: "a".repeat(40),
        approvalReference: "RWOS-STAGING-E2E-001"
      })
    ).not.toThrow();
    expect(() =>
      assertBootstrapBoundary({
        environment: "production",
        releaseSha: "a".repeat(40),
        approvalReference: "RWOS-STAGING-E2E-001"
      })
    ).toThrow("RWOS_STAGING_E2E_ENVIRONMENT_DENIED");
    expect(() =>
      assertBootstrapBoundary({
        environment: "staging",
        releaseSha: "not-a-sha",
        approvalReference: "RWOS-STAGING-E2E-001"
      })
    ).toThrow("RWOS_STAGING_E2E_RELEASE_SHA_INVALID");
  });

  it("resolves exactly the employer + worker synthetic sign-in users from individual passwords", () => {
    const credentials = resolveSyntheticCredentials({
      RWOS_E2E_EMPLOYER_PASSWORD: "employer-password-1",
      RWOS_E2E_WORKER_PASSWORD: "worker-password-12"
    } as NodeJS.ProcessEnv);
    expect(credentials.map((c) => c.role)).toEqual(["employer", "worker"]);
    expect(credentials.every((c) => c.email.endsWith("@rwos-staging.invalid"))).toBe(true);
  });

  it("rejects a missing or too-short synthetic password", () => {
    expect(() => resolveSyntheticCredentials({} as NodeJS.ProcessEnv)).toThrow(
      "RWOS_STAGING_E2E_EMPLOYER_PASSWORD_INVALID"
    );
    expect(() =>
      resolveSyntheticCredentials({
        RWOS_E2E_EMPLOYER_PASSWORD: "employer-password-1",
        RWOS_E2E_WORKER_PASSWORD: "short"
      } as NodeJS.ProcessEnv)
    ).toThrow("RWOS_STAGING_E2E_WORKER_PASSWORD_INVALID");
  });
});

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("staging E2E synthetic password bootstrap materialization", () => {
  const prisma = createPrismaClient(databaseUrl);
  const credentials = [
    { role: "employer", email: syntheticSignInUsers[0].email, password: "employer-password-1" },
    { role: "worker", email: syntheticSignInUsers[1].email, password: "worker-password-12" }
  ] as const;

  async function cleanup() {
    await prisma.$executeRawUnsafe(
      `DELETE FROM user_identities WHERE provider_subject = ANY($1::text[])`,
      credentials.map((c) => c.email)
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM users WHERE email_normalized = ANY($1::text[])`,
      credentials.map((c) => c.email)
    );
    // audit_events are append-only (BEFORE DELETE trigger) and cannot be cleaned; assertions below
    // measure the delta they add rather than an absolute count.
  }

  async function auditCount() {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM audit_events
        WHERE policy_version = 'staging-e2e-synthetic-password-bootstrap-v1'`
    );
    return Number(rows[0]!.count);
  }

  beforeEach(async () => {
    await cleanup();
    for (const credential of credentials) {
      // A synthetic user as QA-reset `prepare` leaves it: active, but with no local_password identity.
      await prisma.$executeRawUnsafe(
        `INSERT INTO users (id, public_id, email_normalized, display_name, status, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        randomUUID(),
        `test-${credential.role}-${randomUUID().slice(0, 8)}`,
        credential.email,
        `${credential.role} synthetic`
      );
    }
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("creates a verifiable local_password identity for each synthetic sign-in user", async () => {
    const now = new Date();
    const auditBefore = await auditCount();
    const updated = await bootstrapSyntheticPasswords(prisma, credentials, {
      releaseSha: "a".repeat(40),
      now
    });
    expect(updated).toBe(2);

    for (const credential of credentials) {
      const rows = await prisma.$queryRawUnsafe<Array<{ password_hash: string | null }>>(
        `SELECT password_hash FROM user_identities
          WHERE provider = 'local_password' AND provider_subject = $1`,
        credential.email
      );
      expect(rows).toHaveLength(1);
      expect(await verifyPassword(credential.password, rows[0]!.password_hash)).toBe(true);
      expect(await verifyPassword("the-wrong-password", rows[0]!.password_hash)).toBe(false);
    }

    expect((await auditCount()) - auditBefore).toBe(1);
  });

  it("is idempotent — a second run rotates in place without duplicating identities", async () => {
    const first = { releaseSha: "a".repeat(40), now: new Date() };
    await bootstrapSyntheticPasswords(prisma, credentials, first);
    await bootstrapSyntheticPasswords(prisma, credentials, { releaseSha: "b".repeat(40), now: new Date() });

    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM user_identities
        WHERE provider = 'local_password' AND provider_subject = ANY($1::text[])`,
      credentials.map((c) => c.email)
    );
    expect(Number(rows[0]!.count)).toBe(2);
  });

  it("refuses to run when a synthetic sign-in user has not been prepared", async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM users WHERE email_normalized = $1`,
      credentials[1]!.email
    );
    await expect(
      bootstrapSyntheticPasswords(prisma, credentials, { releaseSha: "a".repeat(40), now: new Date() })
    ).rejects.toThrow("RWOS_STAGING_E2E_SYNTHETIC_USER_MISSING");

    // The transaction rolled back — the employer identity from this run must not persist.
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM user_identities
        WHERE provider = 'local_password' AND provider_subject = $1`,
      credentials[0]!.email
    );
    expect(Number(rows[0]!.count)).toBe(0);
  });
});
