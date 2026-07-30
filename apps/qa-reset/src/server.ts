import type { IdentityTokenVerifier } from "@rwos/service-auth";
import { composeQaResetServer, type QaResetPostgresFactory } from "./composition";
import { readQaResetConfig } from "./config";
import { startQaResetFailClosedServer } from "./failClosedServer";
import { createQaResetLogger } from "./logger";
import { createResetManifest } from "./manifest";

export function startQaResetServer(options: {
  postgresFactory?: QaResetPostgresFactory;
  identityVerifier?: IdentityTokenVerifier;
}) {
  const config = readQaResetConfig();
  const manifest = createResetManifest(config);
  const logger = createQaResetLogger();
  const server = composeQaResetServer({
    config,
    manifest,
    logger,
    ...(options.postgresFactory ? { postgresFactory: options.postgresFactory } : {}),
    ...(options.identityVerifier ? { identityVerifier: options.identityVerifier } : {})
  });

  server.listen(config.port, "0.0.0.0", () => {
    logger.info("qa_reset.started", {
      releaseSha: config.releaseSha,
      manifestId: config.manifestId,
      manifestChecksum: config.manifestChecksum,
      status: "listening"
    });
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("qa_reset.shutdown_started");
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close((error) => {
      clearTimeout(timeout);
      if (error) {
        logger.error("qa_reset.shutdown_failed");
        process.exitCode = 1;
      }
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  return server;
}

// The packaged entry point has no implicit memory or credential-bearing persistence fallback.
// Until a deployment composition root injects PostgreSQL and identity-verifier ports, expose only
// liveness and fail every readiness or operation request closed.
try {
  startQaResetServer({});
} catch (error) {
  if (!(error instanceof Error) || error.message !== "QA_RESET_POSTGRES_FACTORY_REQUIRED") {
    throw error;
  }
  startQaResetFailClosedServer(Number(process.env.PORT ?? "8080"));
}
