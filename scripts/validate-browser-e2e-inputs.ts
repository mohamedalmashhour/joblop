import { validateBrowserE2eEnvironment } from "../tests/e2e/e2e-environment-policy";

const issues = validateBrowserE2eEnvironment(process.env);
if (issues.length) {
  for (const issue of issues) process.stderr.write(`BROWSER_E2E_INPUT_ERROR: ${issue}\n`);
  process.exit(1);
}
process.stdout.write(`BROWSER_E2E_INPUT_PASS releaseSha=${process.env.RWOS_RELEASE_SHA}\n`);
