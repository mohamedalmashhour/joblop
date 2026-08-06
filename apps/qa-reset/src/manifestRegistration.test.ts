import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerApprovedStagingManifest,
  supersedeApprovedStagingManifest
} from "./manifestRegistration";
import { testConfig, testManifest } from "./testFixture";

const originalEnvironment = process.env.RWOS_ENV;
const originalConfirmation = process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION;
const originalSupersession = process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalEnvironment === undefined) delete process.env.RWOS_ENV;
  else process.env.RWOS_ENV = originalEnvironment;
  if (originalConfirmation === undefined) {
    delete process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION;
  } else {
    process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION = originalConfirmation;
  }
  if (originalSupersession === undefined) {
    delete process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION;
  } else {
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION = originalSupersession;
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

  it("atomically retires one unused active manifest before registering a different manifest", async () => {
    process.env.RWOS_ENV = "staging";
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION =
      "supersede-approved-synthetic-staging-manifest";
    const previousChecksum = "f".repeat(64);
    const replacement = {
      ...testManifest,
      manifestId: "rwos-qa-reset-manifest-v2"
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ locked: "1" }])
      .mockResolvedValueOnce([{ id: testConfig.organizationOwnerAccessRoleId }])
      .mockResolvedValueOnce([
        {
          id: "00000000-0000-4000-8000-000000000900",
          manifest_reference: "rwos-qa-reset-manifest-v1",
          manifest_checksum: previousChecksum,
          release_sha: "0".repeat(40),
          status: "active"
        }
      ])
      .mockResolvedValueOnce([{ count: 0n }]);
    const execute = vi.fn().mockResolvedValue(1);
    const transaction = vi.fn(async (operation) =>
      operation({
        $queryRawUnsafe: query,
        $executeRawUnsafe: execute
      })
    );

    const result = await supersedeApprovedStagingManifest(
      { $transaction: transaction } as never,
      replacement,
      testConfig.organizationOwnerAccessRoleId,
      previousChecksum
    );

    expect(result).toMatchObject({ registered: true, idempotent: false, superseded: true });
    expect(execute.mock.calls[0]?.[0]).toContain("SET status = 'retired'");
    expect(execute.mock.calls[1]?.[0]).toContain("INSERT INTO qa_reset_manifest_ownership");
    expect(execute).toHaveBeenCalledTimes(
      1 + 1 + replacement.tenantIds.length + replacement.records.length
    );
  });

  it("fails closed without retiring when the previous manifest has any durable run", async () => {
    process.env.RWOS_ENV = "staging";
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION =
      "supersede-approved-synthetic-staging-manifest";
    const previousChecksum = "f".repeat(64);
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ locked: "1" }])
      .mockResolvedValueOnce([{ id: testConfig.organizationOwnerAccessRoleId }])
      .mockResolvedValueOnce([
        {
          id: "00000000-0000-4000-8000-000000000900",
          manifest_reference: "rwos-qa-reset-manifest-v1",
          manifest_checksum: previousChecksum,
          release_sha: "0".repeat(40),
          status: "active"
        }
      ])
      .mockResolvedValueOnce([{ count: 1n }]);
    const execute = vi.fn();
    const transaction = vi.fn(async (operation) =>
      operation({
        $queryRawUnsafe: query,
        $executeRawUnsafe: execute
      })
    );

    await expect(
      supersedeApprovedStagingManifest(
        { $transaction: transaction } as never,
        { ...testManifest, manifestId: "rwos-qa-reset-manifest-v2" },
        testConfig.organizationOwnerAccessRoleId,
        previousChecksum
      )
    ).rejects.toThrow("QA_RESET_MANIFEST_SUPERSESSION_RUNS_PRESENT");
    expect(execute).not.toHaveBeenCalled();
  });
});
