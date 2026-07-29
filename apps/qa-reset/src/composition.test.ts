import { describe, expect, it } from "vitest";
import { createResetControlStore } from "./control";
import { composeQaResetServer, createFixedPostgresQaResetRepository } from "./composition";
import { createQaResetLogger } from "./logger";
import { MemoryResetLock, MemoryResetRepository } from "./repository";
import { testConfig, testManifest } from "./testFixture";

describe("QA-reset runtime composition", () => {
  const durableRepository = createFixedPostgresQaResetRepository(fakePrismaClient());
  it("fails startup closed when staging has no PostgreSQL factory", () => {
    expect(() =>
      composeQaResetServer({
        config: testConfig,
        manifest: testManifest,
        logger: createQaResetLogger(() => {})
      })
    ).toThrow("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  });

  it("accepts only an explicitly injected PostgreSQL persistence port", () => {
    const server = composeQaResetServer({
      config: testConfig,
      manifest: testManifest,
      logger: createQaResetLogger(() => {}),
      postgresFactory: () => ({
        kind: "postgres",
        repository: new MemoryResetRepository(),
        durableRepository,
        lock: new MemoryResetLock(),
        control: createResetControlStore(),
        ready: () => true
      })
    });
    expect(server.listening).toBe(false);
    server.close();
  });

  it("does not allow a caller to relabel memory persistence as a non-PostgreSQL mode", () => {
    expect(() =>
      composeQaResetServer({
        config: testConfig,
        manifest: testManifest,
        logger: createQaResetLogger(() => {}),
        postgresFactory: () =>
          ({
            kind: "memory",
            repository: new MemoryResetRepository(),
            durableRepository,
            lock: new MemoryResetLock(),
            control: createResetControlStore(),
            ready: () => true
          }) as never
      })
    ).toThrow("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  });

  it("rejects a PostgreSQL label without the fixed durable repository", () => {
    expect(() =>
      composeQaResetServer({
        config: testConfig,
        manifest: testManifest,
        logger: createQaResetLogger(() => {}),
        postgresFactory: () =>
          ({
            kind: "postgres",
            repository: new MemoryResetRepository(),
            lock: new MemoryResetLock(),
            control: createResetControlStore(),
            ready: () => true
          }) as never
      })
    ).toThrow("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  });
});

function fakePrismaClient() {
  const query = async () => [];
  const execute = async () => 1;
  return {
    $queryRawUnsafe: query,
    $executeRawUnsafe: execute,
    $transaction: async <T>(
      work: (transaction: {
        $queryRawUnsafe: typeof query;
        $executeRawUnsafe: typeof execute;
      }) => Promise<T>
    ) => work({ $queryRawUnsafe: query, $executeRawUnsafe: execute })
  } as never;
}
