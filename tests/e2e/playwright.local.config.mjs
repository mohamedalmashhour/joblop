// LOCAL TEST ONLY — NOT ACCEPTABLE AS PRODUCTION/STAGING CERTIFICATION.
//
// A SEPARATE local disposable browser-E2E config. It is NOT a loophole in the authoritative staging
// config (tests/e2e/playwright.config.mjs) — that file, its localhost-hostile environment policy,
// HTTPS requirement, qa-reset authorization and manifest verification remain UNTOUCHED. This config
// launches the API + worker + employer + admin apps on localhost against a disposable Postgres
// (provisioned by tests/e2e/local/run.ts) and drives the REAL sign-in flow with synthetic identities.
import { defineConfig, devices } from "@playwright/test";

const API_PORT = Number(process.env.RWOS_LOCAL_E2E_API_PORT ?? 4100);
const WORKER_PORT = Number(process.env.RWOS_LOCAL_E2E_WORKER_PORT ?? 8090);
const EMPLOYER_PORT = Number(process.env.RWOS_LOCAL_E2E_EMPLOYER_PORT ?? 8081);
const ADMIN_PORT = Number(process.env.RWOS_LOCAL_E2E_ADMIN_PORT ?? 8082);
const apiOrigin = `http://127.0.0.1:${API_PORT}`;

const nextEnv = (port) => ({
  ...process.env,
  PORT: String(port),
  INTERNAL_API_ORIGIN: apiOrigin,
  RWOS_ENV: "local",
  NODE_ENV: "development"
});

export default defineConfig({
  testDir: "browser-local",
  testMatch: ["**/*.spec.mjs"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  // Generous per-test timeout: `next dev` compiles each BFF route lazily on first hit, which can
  // exceed the default 30s on a cold route. This is a dev-mode compile cost, not app latency.
  timeout: 120_000,
  reporter: [["list"]],
  outputDir: "artifacts/playwright-local-results",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ignoreHTTPSErrors: false
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @rwos/api run dev",
      url: `${apiOrigin}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { ...process.env, API_PORT: String(API_PORT), RWOS_ENV: "local", NODE_ENV: "development" }
    },
    {
      command: "pnpm --filter @rwos/worker run dev",
      url: `http://127.0.0.1:${WORKER_PORT}/`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: nextEnv(WORKER_PORT)
    },
    {
      command: "pnpm --filter @rwos/employer exec next dev --hostname 127.0.0.1 --port " + EMPLOYER_PORT,
      url: `http://127.0.0.1:${EMPLOYER_PORT}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: nextEnv(EMPLOYER_PORT)
    },
    {
      command: "pnpm --filter @rwos/admin exec next dev --hostname 127.0.0.1 --port " + ADMIN_PORT,
      url: `http://127.0.0.1:${ADMIN_PORT}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: nextEnv(ADMIN_PORT)
    }
  ]
});
