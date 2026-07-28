import { buildApi } from "./app";
import { getRuntimeConfig } from "@rwos/config";
import { createLogger } from "@rwos/observability";

const logger = createLogger("api");
const config = getRuntimeConfig();
const app = buildApi();
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn("api.shutdown.started", { signal });
  const deadline = setTimeout(() => {
    logger.error("api.shutdown.deadline_exceeded", { signal });
    process.exit(1);
  }, 10_000);
  deadline.unref();
  try {
    await app.close();
    clearTimeout(deadline);
    logger.info("api.shutdown.completed", { signal });
  } catch {
    clearTimeout(deadline);
    logger.error("api.shutdown.failed", { signal });
    process.exitCode = 1;
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ host: "0.0.0.0", port: config.apiPort });
  logger.info("api.started", {
    environment: config.rwosEnv,
    port: config.apiPort
  });
} catch {
  logger.error("api.startup.failed", {
    environment: config.rwosEnv,
    port: config.apiPort
  });
  process.exitCode = 1;
}
