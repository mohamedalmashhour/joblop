import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@rwos/auth": `${root}packages/auth/src/index.ts`,
      "@rwos/config": `${root}packages/config/src/index.ts`,
      "@rwos/database": `${root}packages/database/src/index.ts`,
      "@rwos/design-system": `${root}packages/design-system/src/index.ts`,
      "@rwos/notifications": `${root}packages/notifications/src/index.ts`,
      "@rwos/observability": `${root}packages/observability/src/index.ts`,
      "@rwos/service-auth/testing": `${root}packages/service-auth/src/testing.ts`,
      "@rwos/service-auth": `${root}packages/service-auth/src/index.ts`,
      "@rwos/shared": `${root}packages/shared/src/index.ts`,
      "@rwos/ui": `${root}packages/ui/src/index.ts`,
      "@rwos/validation": `${root}packages/validation/src/index.ts`
    }
  },
  test: {
    environment: "node",
    exclude: [
      ...configDefaults.exclude,
      "tests/e2e/browser/**",
      "apps/api/src/firstAdminBootstrap.postgres.test.ts",
      "apps/api/src/passwordReset.postgres.test.ts",
      "apps/api/src/stripeTestProvider.network.test.ts"
    ],
    maxWorkers: 4,
    testTimeout: 15_000
  }
});
