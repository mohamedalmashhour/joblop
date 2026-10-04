import { createPrismaClient, type PrismaClient } from "@rwos/database";
import {
  createGoogleIdentityTokenVerifier,
  type GoogleIdentityVerificationClient
} from "@rwos/service-auth/google";
import type { IdentityTokenVerifier } from "@rwos/service-auth";
import type { QaResetConfig } from "./config";
import { createResetControlStore } from "./control";
import type { ResetManifest } from "./manifest";
import { createFixedPostgresQaResetRepository, type QaResetPostgresFactory } from "./composition";
import type { ResetLock, ResetRepository } from "./repository";

type QaResetPrismaClient = Pick<
  PrismaClient,
  "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction" | "$disconnect"
>;

export type QaResetRuntimeComposition = Readonly<{
  postgresFactory: QaResetPostgresFactory;
  identityVerifier: IdentityTokenVerifier;
  close(): Promise<void>;
}>;

export function createQaResetRuntimeComposition(options: {
  config: QaResetConfig;
  manifest: ResetManifest;
  env?: NodeJS.ProcessEnv;
  createClient?: (databaseUrl: string) => QaResetPrismaClient;
  identityVerifier?: IdentityTokenVerifier;
  googleVerificationClient?: GoogleIdentityVerificationClient;
  now?: () => Date;
}): QaResetRuntimeComposition {
  const env = options.env ?? process.env;
  if (options.config.environment !== "staging" || env.RWOS_ENV !== "staging") {
    throw new Error("QA_RESET_STAGING_ONLY");
  }
  assertExactBinding(options.config, options.manifest);
  const databaseUrl = stagingDatabaseUrl(env);
  const client = (options.createClient ?? createPrismaClient)(databaseUrl);
  const identityVerifier =
    options.identityVerifier ??
    createGoogleIdentityTokenVerifier({
      runtimeEnvironment: "staging",
      ...(options.googleVerificationClient ? { client: options.googleVerificationClient } : {})
    });
  const durableRepository = createFixedPostgresQaResetRepository(client, options.now);
  const postgresFactory: QaResetPostgresFactory = (config, manifest) => {
    assertExactBinding(config, manifest);
    if (
      config.projectId !== options.config.projectId ||
      config.clusterId !== options.config.clusterId ||
      config.databaseId !== options.config.databaseId ||
      config.authorityId !== options.config.authorityId ||
      config.namespace !== options.config.namespace ||
      config.releaseSha !== options.config.releaseSha ||
      manifest.checksum !== options.manifest.checksum
    ) {
      throw new Error("QA_RESET_RUNTIME_BINDING_MISMATCH");
    }
    return {
      kind: "postgres",
      repository: failClosedRepository,
      durableRepository,
      lock: failClosedLock,
      control: createResetControlStore(),
      ready: async () => {
        try {
          const rows = await client.$queryRawUnsafe<Array<{ ready: number }>>("SELECT 1 AS ready");
          return rows.length === 1 && Number(rows[0]?.ready) === 1;
        } catch {
          return false;
        }
      }
    };
  };
  return Object.freeze({
    postgresFactory,
    identityVerifier,
    async close() {
      await client.$disconnect();
    }
  });
}

function stagingDatabaseUrl(env: NodeJS.ProcessEnv) {
  const raw = env.DATABASE_URL;
  if (!raw) throw new Error("QA_RESET_DATABASE_URL_REQUIRED");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("QA_RESET_DATABASE_URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    !parsed.pathname ||
    parsed.pathname === "/" ||
    /(?:^|[-_.])(prod|production)(?:$|[-_.])/iu.test(parsed.hostname) ||
    /(?:^|[-_.])(prod|production)(?:$|[-_.])/iu.test(parsed.pathname)
  ) {
    throw new Error("QA_RESET_DATABASE_URL_INVALID");
  }
  if (
    env.NODE_ENV !== "test" &&
    ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error("QA_RESET_DATABASE_URL_INVALID");
  }
  return raw;
}

function assertExactBinding(config: QaResetConfig, manifest: ResetManifest) {
  if (
    manifest.namespace !== config.namespace ||
    manifest.manifestId !== config.manifestId ||
    manifest.checksum !== config.manifestChecksum ||
    manifest.releaseSha !== config.releaseSha ||
    manifest.projectId !== config.projectId ||
    manifest.clusterId !== config.clusterId ||
    manifest.databaseId !== config.databaseId ||
    manifest.authorityId !== config.authorityId ||
    manifest.tenantIds.length !== 2 ||
    !manifest.tenantIds.includes(config.tenantAId) ||
    !manifest.tenantIds.includes(config.tenantBId)
  ) {
    throw new Error("QA_RESET_RUNTIME_BINDING_MISMATCH");
  }
}

const failClosedRepository: ResetRepository = Object.freeze({
  inspect() {
    throw new Error("QA_RESET_DURABLE_REPOSITORY_REQUIRED");
  },
  prepare() {
    throw new Error("QA_RESET_DURABLE_REPOSITORY_REQUIRED");
  },
  cleanup() {
    throw new Error("QA_RESET_DURABLE_REPOSITORY_REQUIRED");
  }
});

const failClosedLock: ResetLock = Object.freeze({
  acquire() {
    return false;
  },
  release() {}
});
