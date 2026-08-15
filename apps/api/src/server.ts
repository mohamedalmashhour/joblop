import { createServer } from "node:http";
import { buildApi } from "./app";
import { getRuntimeConfig, resolveCountryConfig, type CountryProfile } from "@rwos/config";
import { moneyEngineCurrencies } from "@rwos/shared";
import { createLogger } from "@rwos/observability";
import { apiCountryRegistry } from "./countryRegistry";

const logger = createLogger("api");
const config = getRuntimeConfig();

// Fail-closed country selection (MULTI_COUNTRY_PLATFORM_POLICY.md). The application refuses to serve
// when the country profile is missing (staging/production), unsupported, or incomplete. Country
// profiles live in isolated countries/<country>/ implementations and are injected via the API
// composition-root registry (apiCountryRegistry). Phase 2a wires Syria in as RECOGNIZED, but its
// gate is CLOSED and its profile INCOMPLETE, so selecting it still fail-closes; local/test with no
// RWOS_COUNTRY fall back to the non-market neutral fixture. Production deploys must come from
// a certified country implementation (see the phased migration plan), never directly from this
// master image. On refusal we do NOT serve the app — we start a liveness-only fail-closed server
// (mirrors apps/qa-reset/src/failClosedServer.ts): /health reports the process is alive but NOT
// ready, and every other path (including /ready) returns 503, so no real traffic is served.
function resolveSelectedCountry(): { ok: true; profile: CountryProfile } | { ok: false; reason: string } {
  try {
    const profile = resolveCountryConfig({
      rwosEnv: config.rwosEnv,
      country: process.env.RWOS_COUNTRY,
      registry: apiCountryRegistry
    });
    return { ok: true, profile };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "unknown" };
  }
}

function startFailClosedLiveness(reason: string) {
  logger.error("api.country.fail_closed_liveness_only", {
    environment: config.rwosEnv,
    port: config.apiPort,
    reason
  });
  createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response
        .writeHead(200, { "content-type": "application/json" })
        .end('{"status":"alive","ready":false,"reason":"country_profile_unavailable"}');
      return;
    }
    response
      .writeHead(503, { "content-type": "application/json" })
      .end('{"status":"unavailable","reason":"country_profile_unavailable"}');
  }).listen(config.apiPort, "0.0.0.0");
}

async function startApi(profile: CountryProfile) {
  // Inject the SELECTED country's timezone + currency (never an implicit Canada default). The neutral
  // fixture has no timezone/currency (null), so local/test runs supply `timezone` per request; an
  // activatable country provides them. Absent timezone → payroll-period creation without an explicit
  // timezone fails closed. The currency is threaded from the existing CountryProfile.currency so the
  // country profile is authoritative at the composition boundary; it is NOT yet consumed by any money
  // path (Stage 2b.3a scope) — the fail-closed currency gate is enforced before startApi() runs.
  const app = buildApi({
    countryTimezone: profile.timezone ?? undefined,
    countryCurrency: profile.currency ?? undefined
  });
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
    logger.info("api.started", { environment: config.rwosEnv, port: config.apiPort });
  } catch {
    logger.error("api.startup.failed", { environment: config.rwosEnv, port: config.apiPort });
    process.exitCode = 1;
  }
}

// Fail-closed currency gate (Stage 2b.3a): if the selected country declares a currency the existing
// money subsystem cannot execute (i.e. not in moneyEngineCurrencies), we refuse to serve rather than
// silently proceeding or falling back to CAD. The neutral fixture (currency null) is exempt — it has
// no country currency to assert. This does NOT widen what any money path accepts; it only makes the
// profile currency authoritative and fail-closed at the composition boundary.
function countryCurrencyIsExecutable(profile: CountryProfile): boolean {
  if (profile.currency === null) return true;
  return (moneyEngineCurrencies as readonly string[]).includes(profile.currency);
}

const selected = resolveSelectedCountry();
if (!selected.ok) {
  startFailClosedLiveness(selected.reason);
} else if (!countryCurrencyIsExecutable(selected.profile)) {
  startFailClosedLiveness(`country_currency_unsupported:${selected.profile.currency}`);
} else {
  logger.info("api.country.selected", {
    country: selected.profile.country,
    timezone: selected.profile.timezone,
    currency: selected.profile.currency
  });
  await startApi(selected.profile);
}
