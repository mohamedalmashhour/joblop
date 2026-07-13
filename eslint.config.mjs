import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const nextConfigs = compat.extends("next/core-web-vitals").map((config) => ({
  ...config,
  files: [
    "apps/admin/**/*.{js,jsx,ts,tsx}",
    "apps/employer/**/*.{js,jsx,ts,tsx}",
    "app/**/*.{js,jsx,ts,tsx}",
    "pages/**/*.{js,jsx,ts,tsx}"
  ],
  settings: {
    ...config.settings,
    next: {
      rootDir: ["apps/admin/", "apps/employer/"]
    }
  },
  rules: {
    ...config.rules,
    "@next/next/no-html-link-for-pages": "off"
  }
}));

export default [
  {
    ignores: ["**/.next/**", "**/dist/**", "**/node_modules/**", "**/coverage/**", "pnpm-lock.yaml"]
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
  ...nextConfigs,
  {
    files: ["**/next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off"
    }
  }
];
