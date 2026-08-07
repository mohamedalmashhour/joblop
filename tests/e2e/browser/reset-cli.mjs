import process from "node:process";
import { resetBrowserEnvironment } from "./reset-environment.mjs";

// Ordered-step driver for the authenticated browser E2E: `prepare` materializes the synthetic
// fixture (an in-VPC credential-bootstrap job then sets sign-in passwords), and `cleanup` retires
// it. Kept out of Playwright globalSetup/globalTeardown so the bootstrap job can run in between.
const action = process.argv[2];
if (action !== "prepare" && action !== "cleanup") {
  process.stderr.write("usage: reset-cli.mjs <prepare|cleanup>\n");
  process.exit(2);
}

await resetBrowserEnvironment(action);
process.stdout.write(`BROWSER_E2E_RESET_${action.toUpperCase()}_OK\n`);
