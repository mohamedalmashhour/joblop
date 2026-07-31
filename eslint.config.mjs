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
      "pnpm-lock.yaml"
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
      "@typescript-eslint/consistent-type-imports": "error"
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
