import { readOfferDeliveryConfig } from "./config";
import { buildOfferDeliveryHttpServer } from "./http";
import { createDeliveryLogger } from "./logger";
import { createDeliveryManifest } from "./manifest";

const config = readOfferDeliveryConfig();
const logger = createDeliveryLogger();
const manifest = createDeliveryManifest(config);
const server = buildOfferDeliveryHttpServer({ config, logger, manifest });

server.listen(config.port, "0.0.0.0", () => {
  logger.info("offer_delivery.started", {
    releaseSha: config.releaseSha,
    status: "listening"
  });
});

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("offer_delivery.shutdown_started");
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      logger.error("offer_delivery.shutdown_failed");
      process.exitCode = 1;
    }
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
