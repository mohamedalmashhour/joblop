import { readLimiterConfig } from "./config";
import { buildLimiterHttpServer } from "./http";
import { createLimiterLogger } from "./logger";
import { RedisLimiterStore } from "./redisStore";

const logger = createLimiterLogger();
const config = readLimiterConfig();
const store = new RedisLimiterStore(config.redisUrl, config.namespace);
const server = buildLimiterHttpServer({ config, store, logger });
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn("auth_limiter.shutdown_started", { signal });
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref();
  server.close(async () => {
    await store.close();
    clearTimeout(deadline);
    logger.info("auth_limiter.shutdown_completed", { signal });
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

server.listen(config.port, "0.0.0.0", () => {
  logger.info("auth_limiter.started", {
    environment: config.environment,
    port: config.port
  });
});
