import { describe, expect, it } from "vitest";
import { normalizeResetRequest } from "./command";
import { testConfig } from "./testFixture";

describe("browser and native reset normalization", () => {
  it("normalizes the existing browser body shape", () => {
    expect(
      normalizeResetRequest(
        {
          action: "prepare",
          tenantIds: [testConfig.tenantAId, testConfig.tenantBId],
          releaseSha: testConfig.releaseSha,
          confirmation: "authorized-staging-browser-e2e"
        },
        "dry-run",
        testConfig
      )
    ).toMatchObject({ scope: "browser", action: "prepare", tenantIds: expect.any(Array) });
  });

  it("normalizes the existing native body shape", () => {
    expect(
      normalizeResetRequest(
        {
          action: "prepare",
          authorityId: testConfig.authorityId,
          tenantId: testConfig.tenantAId,
          releaseSha: testConfig.releaseSha,
          confirmation: "authorized-staging-native-e2e"
        },
        "dry-run",
        testConfig
      )
    ).toMatchObject({
      scope: "native",
      action: "prepare",
      tenantIds: [testConfig.tenantAId]
    });
  });

  it("rejects wrong release, authority, tenant, confirmation and unknown fields", () => {
    const base = {
      action: "prepare",
      authorityId: testConfig.authorityId,
      tenantId: testConfig.tenantAId,
      releaseSha: testConfig.releaseSha,
      confirmation: "authorized-staging-native-e2e"
    };
    for (const override of [
      { releaseSha: "0".repeat(40) },
      { authorityId: "gcp/qa-reset/authorities/other" },
      { tenantId: "gcp/tenants/other" },
      { confirmation: "wrong" },
      { arbitraryTable: "users" }
    ]) {
      expect(() =>
        normalizeResetRequest({ ...base, ...override }, "dry-run", testConfig)
      ).toThrow();
    }
  });
});
