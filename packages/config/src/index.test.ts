import { describe, expect, it } from "vitest";
import { getRuntimeConfig, validateRuntimeConfig } from "./index";

describe("production runtime configuration", () => {
  it.each([
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "test",
        DATABASE_URL: "postgres://db",
        INTERNAL_API_ORIGIN: "https://api.example.test"
      }
    ],
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        INTERNAL_API_ORIGIN: "https://api.example.test"
      }
    ],
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgres://db",
        INTERNAL_API_ORIGIN: "http://127.0.0.1:4100"
      }
    ]
  ])("fails closed for invalid production input", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
    expect(() => getRuntimeConfig(env)).toThrow();
  });

  it("accepts explicit production configuration without requiring SESSION_SECRET", () => {
    const env = {
      RWOS_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      INTERNAL_API_ORIGIN: "https://api.example.test"
    };
    expect(validateRuntimeConfig(env)).toMatchObject({ success: true });
    expect(getRuntimeConfig(env)).toMatchObject({
      rwosEnv: "production",
      nodeEnv: "production",
      hasDatabaseUrl: true,
      hasSessionSecret: false
    });
  });
});
