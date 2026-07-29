import type { QaResetConfig } from "./config";
import type { ResetControlStore } from "./control";
import { buildQaResetHttpServer } from "./http";
import type { QaResetLogger } from "./logger";
import type { ResetManifest } from "./manifest";
import type { ResetLock, ResetRepository } from "./repository";
import type { IdentityTokenVerifier } from "@rwos/service-auth";
import type { PrismaClient } from "@rwos/database";
import { createFixedEntityMutator } from "./fixedEntityMutator";
import { PostgresQaResetRepository } from "./postgresRepository";
import { createPrismaTransactionExecutor } from "./prismaExecutor";

export type QaResetPersistencePort = Readonly<{
  kind: "postgres";
  repository: ResetRepository;
  durableRepository: PostgresQaResetRepository;
  lock: ResetLock;
  control: ResetControlStore;
  ready(): boolean | Promise<boolean>;
}>;

export type QaResetPostgresFactory = (
  config: QaResetConfig,
  manifest: ResetManifest
) => QaResetPersistencePort;

export function composeQaResetServer(options: {
  config: QaResetConfig;
  manifest: ResetManifest;
  logger: QaResetLogger;
  identityVerifier?: IdentityTokenVerifier;
  postgresFactory?: QaResetPostgresFactory;
  now?: () => Date;
}) {
  if (
    options.config.environment !== "staging" ||
    options.config.persistenceMode !== "postgres" ||
    !options.postgresFactory
  ) {
    throw new Error("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  }
  const persistence = options.postgresFactory(options.config, options.manifest);
  if (
    persistence.kind !== "postgres" ||
    !(persistence.durableRepository instanceof PostgresQaResetRepository)
  ) {
    throw new Error("QA_RESET_POSTGRES_FACTORY_REQUIRED");
  }
  return buildQaResetHttpServer({
    config: options.config,
    manifest: options.manifest,
    repository: persistence.repository,
    lock: persistence.lock,
    control: persistence.control,
    logger: options.logger,
    durableDependencyReady: () => persistence.ready(),
    durableRepository: persistence.durableRepository,
    ...(options.identityVerifier ? { identityVerifier: options.identityVerifier } : {}),
    ...(options.now ? { now: options.now } : {})
  });
}

export function createFixedPostgresQaResetRepository(
  client: Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction">,
  now?: () => Date
) {
  return new PostgresQaResetRepository(
    createPrismaTransactionExecutor(client),
    createFixedEntityMutator(),
    now
  );
}
