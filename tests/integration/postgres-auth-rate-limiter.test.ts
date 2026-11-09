import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@rwos/database";
import { createPostgresAuthenticationRateLimiter } from "../../apps/api/src/postgresAuthRateLimiter";

// The production sign-in limiter (AUTH_RATE_LIMITER_BACKEND=postgres) against real PostgreSQL:
// concurrent attempts from independent clients (as from several API instances) must never let more
// than the policy through, windows must reset, and no raw identifier may reach the table.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const keySecret = "postgres-limiter-integration-secret-32-chars-min";
const namespace = "rwos:authrl:test:v1";

suite("PostgreSQL sign-in rate limiter", () => {
  const clients = [createPrismaClient(databaseUrl), createPrismaClient(databaseUrl), createPrismaClient(databaseUrl)];
  // One limiter per client, same secret/namespace/key id: they share buckets like API instances do.
  const limiters = clients.map((db) =>
    createPostgresAuthenticationRateLimiter({ db, keySecret, namespace, keyId: "it", random: () => 1 })
  );

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.$disconnect()));
  });

  it("reports ready once the migration has created the table", async () => {
    expect(await limiters[0]!.check!()).toBe(true);
  });

  it("lets exactly 5 of 40 concurrent attempts on one account through, across independent clients", async () => {
    const email = `account-${randomUUID()}@example.test`;
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        limiters[index % limiters.length]!.consume({ action: "sign_in", ip: `10.1.${index}.1`, email })
      )
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    for (const refused of results.filter((result) => !result.allowed)) {
      expect(refused.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("lets exactly 30 of 50 concurrent attempts from one address through", async () => {
    const ip = `10.2.0.1-${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        limiters[index % limiters.length]!.consume({ action: "register", ip, email: `n${index}-${randomUUID()}@example.test` })
      )
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(30);
  });

  it("starts a fresh window once the old one has ended", async () => {
    const shortWindow = createPostgresAuthenticationRateLimiter({
      db: clients[0]!,
      keySecret,
      namespace,
      policy: { accountMaxAttempts: 1, networkMaxAttempts: 100, windowSeconds: 1 },
      random: () => 1
    });
    const input = { action: "sign_in" as const, ip: "10.3.0.1", email: `window-${randomUUID()}@example.test` };
    expect((await shortWindow.consume(input)).allowed).toBe(true);
    expect((await shortWindow.consume(input)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1_300));
    expect((await shortWindow.consume(input)).allowed).toBe(true);
  });

  it("never stores the raw email or address", async () => {
    const email = `raw-${randomUUID()}@example.test`;
    await limiters[0]!.consume({ action: "sign_in", ip: "192.0.2.77", email });
    const leaked = await clients[0]!.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM "auth_rate_limit_buckets" WHERE "bucket_key" LIKE $1 OR "bucket_key" LIKE $2`,
      `%${email}%`,
      "%192.0.2.77%"
    );
    expect(leaked[0]!.n).toBe(0);
  });
});
