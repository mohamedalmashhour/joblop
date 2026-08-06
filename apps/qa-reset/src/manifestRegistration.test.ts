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

  it("atomically retires one active manifest with no run history before registering a replacement", async () => {
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
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
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

  it("preserves terminal run history while atomically registering a replacement", async () => {
    process.env.RWOS_ENV = "staging";
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION =
      "supersede-approved-synthetic-staging-manifest";
    const previousChecksum = "f".repeat(64);
    const replacement = { ...testManifest, manifestId: "rwos-qa-reset-manifest-v2" };
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
      .mockResolvedValueOnce([
        { status: "succeeded", completed_at: new Date("2026-08-05T00:00:00Z") },
        { status: "cleanup_completed", completed_at: "2026-08-05T01:00:00Z" },
        { status: "failed", completed_at: new Date("2026-08-05T02:00:00Z") },
        { status: "blocked", completed_at: new Date("2026-08-05T03:00:00Z") }
      ])
      .mockResolvedValueOnce([]);
    const execute = vi.fn().mockResolvedValue(1);
    const transaction = vi.fn(async (operation) =>
      operation({
        $queryRawUnsafe: query,
        $executeRawUnsafe: execute
      })
    );

    await expect(
      supersedeApprovedStagingManifest(
        { $transaction: transaction } as never,
        replacement,
        testConfig.organizationOwnerAccessRoleId,
        previousChecksum
      )
    ).resolves.toMatchObject({ registered: true, superseded: true });
    expect(query.mock.calls[3]?.[0]).toContain("FOR UPDATE");
    expect(execute.mock.calls[0]?.[0]).toContain("SET status = 'retired'");
    expect(execute).toHaveBeenCalledTimes(
      1 + 1 + replacement.tenantIds.length + replacement.records.length
    );
  });

  it.each([
    ["planned", null],
    ["running", null],
    ["unknown", new Date("2026-08-05T00:00:00Z")],
    ["succeeded", null],
    ["future_status", new Date("2026-08-05T00:00:00Z")]
  ])("fails closed without retiring for nonterminal run status %s", async (status, completedAt) => {
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
      .mockResolvedValueOnce([{ status, completed_at: completedAt }]);
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
    ).rejects.toThrow("QA_RESET_MANIFEST_SUPERSESSION_RUNS_NOT_TERMINAL");
    expect(execute).not.toHaveBeenCalled();
  });

  it("reconciles foreign materialized records left by an earlier manifest during supersession", async () => {
    process.env.RWOS_ENV = "staging";
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION =
      "supersede-approved-synthetic-staging-manifest";
    const previousChecksum = "f".repeat(64);
    const replacement = { ...testManifest, manifestId: "rwos-qa-reset-manifest-v2" };
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
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { entity_type: "synthetic_user", target_record_id: "00000000-0000-4000-8000-0000000000a1" },
        {
          entity_type: "membership_access_role",
          target_record_id: "00000000-0000-4000-8000-0000000000a2"
        }
      ]);
    const execute = vi.fn().mockResolvedValue(1);
    const transaction = vi.fn(async (operation) =>
      operation({ $queryRawUnsafe: query, $executeRawUnsafe: execute })
    );

    const result = await supersedeApprovedStagingManifest(
      { $transaction: transaction } as never,
      replacement,
      testConfig.organizationOwnerAccessRoleId,
      previousChecksum
    );

    expect(result).toMatchObject({ superseded: true, reconciledForeignRecords: 1 });
    const statements = execute.mock.calls.map((call) => String(call[0]));
    expect(statements.some((sql) => sql.includes("DELETE FROM users WHERE id = ANY"))).toBe(true);
    // composite-PK table removed via its owning membership, not a synthetic target id
    expect(
      statements.some(
        (sql) => sql.includes("DELETE FROM membership_access_roles") && sql.includes("membership_id")
      )
    ).toBe(true);
    expect(
      statements.some(
        (sql) => sql.includes("UPDATE qa_reset_owned_records") && sql.includes("'cleaned'")
      )
    ).toBe(true);
  });
});
