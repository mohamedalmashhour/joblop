import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "../../vitest.config";

// The two *.integration.test.ts suites each own the shared Postgres fixtures
// (fixed ORGANIZATION_OWNER id, full-table resets), so they must not run in
// parallel against one database. Serialize files; the suite is small.
export default mergeConfig(
  baseConfig,
  defineConfig({ test: { fileParallelism: false } })
);
