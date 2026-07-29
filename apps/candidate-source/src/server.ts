import { readCandidateSourceConfig } from "./config";
import { buildCandidateSourceHttpServer } from "./http";
import { createCandidateLogger } from "./logger";
import { createSyntheticManifest } from "./manifest";

const config = readCandidateSourceConfig();
const logger = createCandidateLogger();
const manifest = createSyntheticManifest(config);
const server = buildCandidateSourceHttpServer({ config, logger, manifest });

server.listen(config.port, "0.0.0.0", () => {
  logger.info("candidate_source.started", {
    releaseSha: config.releaseSha,
    status: "listening"
  });
});

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("candidate_source.shutdown_started");
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      logger.error("candidate_source.shutdown_failed");
      process.exitCode = 1;
    }
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
