import { describe, expect, it } from "vitest";
import { findPublicCredentialLeaks } from "./public-bundle-policy";
import {
  classifyEnvironmentName,
  validateEnvironmentInventory
} from "./environment-classification";

describe("public bundle credential policy", () => {
  it("allows public origins and ordinary client code", () => {
    expect(
      findPublicCredentialLeaks([
        {
          path: "apps/mobile/src/runtime.ts",
          content: 'const origin = process.env.EXPO_PUBLIC_API_ORIGIN; fetch(origin + "/health");'
        },
        {
          path: "apps/employer/app/Client.tsx",
          content: '"use client"; export function Client() { return null; }'
        }
      ])
    ).toEqual([]);
  });

  it.each([
    "EXPO_PUBLIC_QA_RESET_TOKEN",
    "EXPO_PUBLIC_DATABASE_URL",
    "EXPO_PUBLIC_GOOGLE_SERVICE_ACCOUNT",
    "EXPO_PUBLIC_REDIS_SECRET"
  ])("rejects public secret-shaped environment name %s", (name) => {
    expect(
      findPublicCredentialLeaks([
        { path: "apps/mobile/src/runtime.ts", content: `process.env.${name}` }
      ])
    ).not.toHaveLength(0);
  });

  it("rejects server auth imports and credential material in public artifacts", () => {
    const issues = findPublicCredentialLeaks([
      {
        path: "apps/admin/app/Client.tsx",
        content: '"use client"; import { requiredAudience } from "@rwos/service-auth";'
      },
      {
        path: "apps/mobile/dist/index.js",
        content: "GOOGLE_APPLICATION_CREDENTIALS"
      },
      {
        path: "apps/mobile/dist/worker.js",
        content: "X-Serverless-Authorization"
      },
      {
        path: "apps/mobile/dist/qa.js",
        content: "QA_RESET_IOS_E2E_APP_CREDENTIAL"
      }
    ]);
    expect(issues).toHaveLength(4);
  });

  it.each([
    "@rwos/database",
    "@rwos/config",
    "@rwos/service-auth",
    "google-auth-library",
    "../../packages/service-auth/src/index"
  ])("rejects public import of server-only boundary %s", (specifier) => {
    expect(
      findPublicCredentialLeaks([
        {
          path: "apps/mobile/src/forbidden.ts",
          content: `import { forbidden } from "${specifier}";`
        }
      ])
    ).not.toHaveLength(0);
  });

  it("rejects classified server-only and unclassified variables from public code", () => {
    const issues = findPublicCredentialLeaks([
      {
        path: "apps/mobile/src/runtime.ts",
        content: "process.env.INTERNAL_API_ORIGIN; process.env.NEW_UNKNOWN_VARIABLE"
      }
    ]);
    expect(issues).toHaveLength(2);
  });

  it("classifies public, runtime-only and prohibited environment names", () => {
    expect(classifyEnvironmentName("EXPO_PUBLIC_RWOS_ENV")).toBe("public-safe");
    expect(classifyEnvironmentName("EXPO_PUBLIC_RWOS_API_ORIGIN")).toBe("build-time-public");
    expect(classifyEnvironmentName("INTERNAL_API_ORIGIN")).toBe("runtime-server-only");
    expect(classifyEnvironmentName("QA_RESET_IOS_E2E_APP_CREDENTIAL")).toBe(
      "prohibited-from-bundles-and-logs"
    );
  });

  it("fails a repository inventory containing an unclassified environment name", () => {
    expect(
      validateEnvironmentInventory([
        { path: "example.ts", content: "process.env.NOT_CLASSIFIED_ANYWHERE" }
      ]).issues
    ).toEqual(["example.ts: unclassified environment variable NOT_CLASSIFIED_ANYWHERE"]);
  });
});
