import { buildApi } from "./app";
import { getRuntimeConfig, resolveCountryConfig } from "@rwos/config";
import { createLogger } from "@rwos/observability";

const logger = createLogger("api");
const config = getRuntimeConfig();

// Fail-closed country selection (MULTI_COUNTRY_PLATFORM_POLICY.md). Refuse to start when the country
// profile is missing (staging/production), unsupported, or incomplete. Country profiles live in
// isolated countries/<country>/ implementations and are injected via `registry`; Phase 1 wires no
// country into the API runtime yet, so any explicit RWOS_COUNTRY is UNSUPPORTED here and local/test
// fall back to the non-market neutral fixture. Production deploys must come from a certified country
// implementation (see the phased migration plan), never directly from this master image.
try {
  const country = resolveCountryConfig({
    rwosEnv: config.rwosEnv,
    country: process.env.RWOS_COUNTRY,
    registry: {}
  });
  logger.info("api.country.selected", {
    country: country.country,
    activatable: country.activationGate === "open"
  });
} catch (error) {
  logger.error("api.country.refused", {
    environment: config.rwosEnv,
    reason: error instanceof Error ? error.message : "unknown"
  });
  process.exit(1);
}

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
