// LOCAL TEST ONLY — NOT ACCEPTABLE AS PRODUCTION/STAGING CERTIFICATION.
//
// Orchestrates a fully disposable local browser-E2E run: create a throwaway Postgres DB → migrate
// (governed chain) → seed synthetic identities → run the local Playwright config (which launches the
// API + worker + employer + admin apps) → drop the DB. Never touches production or staging.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { assertLocalE2eEnabled, seedLocalE2e } from "./seed";

function sh(command: string, args: string[], env: NodeJS.ProcessEnv = {}): void {
  const r = spawnSync(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${command} ${args.join(" ")} exited ${r.status}`);
}

async function main() {
  assertLocalE2eEnabled(process.env); // fail closed unless RWOS_LOCAL_E2E=enabled and not production

  const user = process.env.USER ?? "postgres";
  const host = process.env.RWOS_LOCAL_E2E_PG_HOST ?? "localhost";
  const pgPort = process.env.RWOS_LOCAL_E2E_PG_PORT ?? "5432";
  const dbName = `rwos_local_e2e_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const databaseUrl = `postgresql://${user}@${host}:${pgPort}/${dbName}`;

  sh("createdb", ["-h", host, "-p", pgPort, dbName]);
  try {
    sh("pnpm", ["--filter", "@rwos/database", "exec", "prisma", "migrate", "deploy"], { DATABASE_URL: databaseUrl });
    await seedLocalE2e(databaseUrl, process.env);

    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: databaseUrl,
      RWOS_ENV: "local",
      RWOS_LOCAL_E2E: "enabled",
      INTERNAL_API_ORIGIN: "http://127.0.0.1:4100",
      API_PORT: "4100",
      RWOS_LOCAL_E2E_API_PORT: "4100",
      RWOS_LOCAL_E2E_WORKER_PORT: "8090",
      RWOS_LOCAL_E2E_EMPLOYER_PORT: "8081",
      RWOS_LOCAL_E2E_ADMIN_PORT: "8082"
    };
    const extra = process.argv.slice(2);
    // --tsconfig tsconfig.base.json avoids Playwright choking on the root tsconfig's project
    // references (mirrors the authoritative staging script in package.json).
    const r = spawnSync("pnpm", ["exec", "playwright", "test", "--tsconfig", "tsconfig.base.json", "--config", "tests/e2e/playwright.local.config.mjs", ...extra], { stdio: "inherit", env: { ...process.env, ...env } });
    process.exitCode = r.status ?? 1;
  } finally {
    spawnSync("dropdb", ["-h", host, "-p", pgPort, "--force", "--if-exists", dbName], { stdio: "inherit" });
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
