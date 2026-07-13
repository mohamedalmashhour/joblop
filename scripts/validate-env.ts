import { validateRuntimeConfig } from "@rwos/config";

const result = validateRuntimeConfig();

if (!result.success) {
  console.error(result.error.flatten());
  process.exit(1);
}

console.log("ENV_VALIDATION_PASS");
