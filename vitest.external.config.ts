import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@rwos/auth": `${root}packages/auth/src/index.ts`,
      "@rwos/brain": `${root}packages/brain/src/index.ts`,
      "@rwos/config": `${root}packages/config/src/index.ts`,
      "@rwos/database": `${root}packages/database/src/index.ts`,
      "@rwos/observability": `${root}packages/observability/src/index.ts`,
      "@rwos/shared": `${root}packages/shared/src/index.ts`
    }
  },
  test: {
    environment: "node",
    exclude: configDefaults.exclude,
    maxWorkers: 1,
    testTimeout: 30_000
  }
});
