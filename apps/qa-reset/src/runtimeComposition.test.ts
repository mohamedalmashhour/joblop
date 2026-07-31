import { describe, expect, it, vi } from "vitest";
import { createFakeIdentityTokenVerifier } from "@rwos/service-auth/testing";
import { createQaResetRuntimeComposition } from "./runtimeComposition";
import { testConfig, testManifest } from "./testFixture";

const databaseUrl = "postgresql://synthetic:synthetic@db.staging.invalid/rwos_qa_reset";

describe("QA-reset deployment composition root", () => {
  it("injects exact staging PostgreSQL and trusted identity dependencies", async () => {
    const client = fakePrismaClient([{ ready: 1 }]);
    const createClient = vi.fn(() => client as never);
    const runtime = createQaResetRuntimeComposition({
      config: testConfig,
      manifest: testManifest,
      env: stagingEnvironment(),
      createClient,
      identityVerifier: createFakeIdentityTokenVerifier({ identities: {} })
    });
    expect(createClient).toHaveBeenCalledWith(databaseUrl);
    const persistence = runtime.postgresFactory(testConfig, testManifest);
    await expect(persistence.ready()).resolves.toBe(true);
    expect(() => persistence.repository.inspect(testManifest)).toThrow(
      "QA_RESET_DURABLE_REPOSITORY_REQUIRED"
    );
    expect(persistence.lock.acquire("unapproved-memory-lock")).toBe(false);
    await runtime.close();
    expect(client.$disconnect).toHaveBeenCalledOnce();
  });

  it("keeps readiness false when PostgreSQL is unavailable", async () => {
    const client = fakePrismaClient(new Error("synthetic database unavailable"));
    const runtime = createQaResetRuntimeComposition({
      config: testConfig,
      manifest: testManifest,
      env: stagingEnvironment(),
      createClient: () => client as never,
      identityVerifier: createFakeIdentityTokenVerifier({ identities: {} })
    });
    await expect(runtime.postgresFactory(testConfig, testManifest).ready()).resolves.toBe(false);
  });

  it.each([
    ["production environment", { RWOS_ENV: "production" }],
    ["missing database", { DATABASE_URL: undefined }],
    ["production database", { DATABASE_URL: "postgresql://user:pass@db.production.invalid/rwos" }],
    [
      "local database outside tests",
      { NODE_ENV: "production", DATABASE_URL: "postgresql://user:pass@localhost/rwos" }
    ]
  ])("fails closed for %s", (_label, override) => {
    expect(() =>
      createQaResetRuntimeComposition({
        config: testConfig,
        manifest: testManifest,
        env: stagingEnvironment(override),
        createClient: () => fakePrismaClient([{ ready: 1 }]) as never,
        identityVerifier: createFakeIdentityTokenVerifier({ identities: {} })
      })
    ).toThrow(/QA_RESET_(?:STAGING_ONLY|DATABASE_URL_REQUIRED|DATABASE_URL_INVALID)/u);
  });

  it("rejects any organization, manifest or release binding mismatch before connecting", () => {
    const createClient = vi.fn(() => fakePrismaClient([{ ready: 1 }]) as never);
    expect(() =>
      createQaResetRuntimeComposition({
        config: testConfig,
        manifest: { ...testManifest, projectId: "gcp/projects/other-staging-project" },
        env: stagingEnvironment(),
        createClient,
        identityVerifier: createFakeIdentityTokenVerifier({ identities: {} })
      })
    ).toThrow("QA_RESET_RUNTIME_BINDING_MISMATCH");
    expect(createClient).not.toHaveBeenCalled();
  });
});

function stagingEnvironment(override: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    RWOS_ENV: "staging",
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    ...override
  };
}

function fakePrismaClient(readiness: Array<{ ready: number }> | Error) {
  const query = vi.fn(async () => {
    if (readiness instanceof Error) throw readiness;
    return readiness;
  });
  const execute = vi.fn(async () => 1);
  return {
    $queryRawUnsafe: query,
    $executeRawUnsafe: execute,
    $transaction: vi.fn(async <T>(work: (transaction: unknown) => Promise<T>) =>
      work({ $queryRawUnsafe: query, $executeRawUnsafe: execute })
    ),
    $disconnect: vi.fn(async () => undefined)
  };
}
