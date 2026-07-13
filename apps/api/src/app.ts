import Fastify from "fastify";
import { getRuntimeConfig } from "@rwos/config";
import { createLogger } from "@rwos/observability";

export function buildApi() {
  const app = Fastify({ logger: false });
  const logger = createLogger("api");

  app.get("/health", async () => {
    const config = getRuntimeConfig();
    logger.info("health-check");

    return {
      ok: true,
      service: "resident-workforce-os-api",
      environment: config.rwosEnv,
      foundationOnly: true
    };
  });

  return app;
}
