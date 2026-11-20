import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const nextConfig = {
  files: [
    "apps/admin/**/*.{js,jsx,ts,tsx}",
    "apps/employer/**/*.{js,jsx,ts,tsx}",
    "app/**/*.{js,jsx,ts,tsx}",
    "pages/**/*.{js,jsx,ts,tsx}"
  ],
  settings: {
    next: {
      rootDir: ["apps/admin/", "apps/employer/"]
    }
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    "@next/next/no-html-link-for-pages": "off"
  }
};

export default [
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      ".staging-inputs/**",
      "contracts/**",
      "pnpm-lock.yaml",
      // Root-level local dev-stack scaffolding scripts and Vitest configs are not part of any
      // app tsconfig project, so typescript-eslint's project service can't type them. They are
      // not shipped code — exempt them from linting rather than forcing them into a tsconfig.
      "local-stack-*.ts",
      "**/vitest.config.ts"
    ]
  },
  js.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      // Allow deliberately-unused args/vars when prefixed with `_` (e.g. a kept public-API
      // parameter that this implementation doesn't consume).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  },
  {
    // The PWA service worker runs in the ServiceWorkerGlobalScope, not the browser window.
    // Give it the service-worker globals it uses at runtime without importing them.
    files: ["**/public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        URL: "readonly",
        clients: "readonly",
        location: "readonly"
      }
    }
  },
  {
    // Node-runtime test script/config files (Playwright configs, browser-E2E origin helpers).
    // These are plain `.mjs` under tests/ (not covered by typescript-eslint's no-undef handling)
    // and use Node + web globals at runtime without importing them. next.config.mjs et al. import
    // `process` themselves, so this override is scoped to tests/ to avoid a no-redeclare conflict.
    files: ["tests/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        performance: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    }
  },
  nextConfig,
  {
    files: ["**/next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off"
    }
  }
];
