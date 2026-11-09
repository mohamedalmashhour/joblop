import { readFileSync } from "node:fs";
import { PLANNED_PRODUCTION_ENV, checkProductionSwitchEnv, parseEnvFile } from "./production-switch-env";

// Usage:
//   pnpm validate:production-switch                 checks the planned env (placeholder secrets)
//   pnpm validate:production-switch -- <env-file>   checks a full copy of the API env after the
//                                                   planned changes (KEY=VALUE lines; kept local,
//                                                   never committed). Prints names only, never values.
const file = process.argv.slice(2).find((argument) => argument !== "--");
const env = file ? parseEnvFile(readFileSync(file, "utf8")) : PLANNED_PRODUCTION_ENV;
const report = checkProductionSwitchEnv(env);

for (const [key, value] of Object.entries(report.summary)) console.log(`${key}=${value}`);
if (!report.ok) {
  for (const issue of report.issues) console.error(`ISSUE ${issue}`);
  console.error("PRODUCTION_SWITCH_VALIDATION_FAIL");
  process.exit(1);
}
console.log(`PRODUCTION_SWITCH_VALIDATION_PASS source=${file ? "env-file" : "planned-placeholders"}`);
