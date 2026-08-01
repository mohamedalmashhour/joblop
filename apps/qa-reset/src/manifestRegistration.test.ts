import { afterEach, describe, expect, it, vi } from "vitest";
import { registerApprovedStagingManifest } from "./manifestRegistration";
import { testConfig, testManifest } from "./testFixture";

const originalEnvironment = process.env.RWOS_ENV;
const originalConfirmation = process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalEnvironment === undefined) delete process.env.RWOS_ENV;
  else process.env.RWOS_ENV = originalEnvironment;
  if (originalConfirmation === undefined) {
    delete process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION;
  } else {
    process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION = originalConfirmation;
  }
});

describe("staging QA manifest registration", () => {
  it("fails before opening a transaction unless the exact staging confirmation is present", async () => {
    process.env.RWOS_ENV = "production";
    process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION = "wrong";
    const transaction = vi.fn();

    await expect(
      registerApprovedStagingManifest(
        { $transaction: transaction } as never,
        testManifest,
        testConfig.organizationOwnerAccessRoleId
      )
    ).rejects.toThrow("QA_RESET_MANIFEST_REGISTRATION_DENIED");
    expect(transaction).not.toHaveBeenCalled();
  });
});
