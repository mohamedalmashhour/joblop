import { describe, expect, it } from "vitest";

import {
  browserE2eConfirmation,
  nativeE2eConfirmation,
  validateBrowserE2eEnvironment,
  validateNativeE2eEnvironment
} from "./e2e-environment-policy";

const sha = "0123456789abcdef0123456789abcdef01234567";
const browser = {
  RWOS_RELEASE_SHA: sha,
  RWOS_E2E_CONFIRMATION: browserE2eConfirmation,
  RWOS_E2E_EMPLOYER_ORIGIN: "https://employer.staging.example.test",
  RWOS_E2E_ADMIN_ORIGIN: "https://admin.staging.example.test",
  RWOS_E2E_WORKER_ORIGIN: "https://worker.staging.example.test",
  RWOS_E2E_EMPLOYER_EMAIL: "employer@example.test",
  RWOS_E2E_EMPLOYER_PASSWORD: "secret",
  RWOS_E2E_ADMIN_EMAIL: "admin@example.test",
  RWOS_E2E_ADMIN_PASSWORD: "secret",
  RWOS_E2E_WORKER_EMAIL: "worker@example.test",
  RWOS_E2E_WORKER_PASSWORD: "secret",
  RWOS_E2E_REVOKED_EMAIL: "revoked@example.test",
  RWOS_E2E_REVOKED_PASSWORD: "secret",
  RWOS_E2E_RESET_ORIGIN: "https://qa-reset.staging.example.test",
  RWOS_E2E_RESET_TOKEN: "secret",
  RWOS_E2E_RESET_SERVICE_IDENTITY: "provider/service/qa-reset-runner-01",
  RWOS_E2E_RESET_OPERATOR_IDENTITY: "provider/operator/qa-owner-01",
  RWOS_E2E_RESET_PROJECT_ID: "provider/project/staging-01",
  RWOS_E2E_RESET_CLUSTER_ID: "provider/cluster/staging-01",
  RWOS_E2E_RESET_DATABASE_ID: "provider/database/staging-01",
  RWOS_E2E_RESET_AUTHORITY_ID: "provider/qa/reset-01",
  RWOS_E2E_RESET_NAMESPACE: "rwos:qa-reset:staging:v1",
  RWOS_E2E_RESET_MANIFEST_ID: "rwos-qa-reset-manifest-v1",
  RWOS_E2E_RESET_MANIFEST_CHECKSUM: "a".repeat(64),
  RWOS_E2E_RESET_DRY_RUN_APPROVAL_REFERENCE: "provider/approval/dry-run-01",
  RWOS_E2E_RESET_PREPARE_APPROVAL_REFERENCE: "provider/approval/prepare-01",
  RWOS_E2E_RESET_CLEANUP_APPROVAL_REFERENCE: "provider/approval/cleanup-01",
  RWOS_E2E_TENANT_A_ID: "tenant-a",
  RWOS_E2E_TENANT_B_ID: "tenant-b"
};

describe("target-environment E2E policy", () => {
  it("accepts explicit browser staging inputs", () => {
    expect(validateBrowserE2eEnvironment(browser)).toEqual([]);
  });

  it("rejects missing or local browser inputs", () => {
    expect(validateBrowserE2eEnvironment({})).not.toEqual([]);
    expect(
      validateBrowserE2eEnvironment({
        ...browser,
        RWOS_E2E_EMPLOYER_ORIGIN: "http://localhost:3000",
        RWOS_E2E_TENANT_B_ID: "tenant-a"
      })
    ).toEqual(
      expect.arrayContaining([
        "RWOS_E2E_EMPLOYER_ORIGIN must be remote HTTPS.",
        "RWOS_E2E_TENANT_A_ID and RWOS_E2E_TENANT_B_ID must differ."
      ])
    );
  });

  it("accepts explicit native staging inputs", () => {
    expect(
      validateNativeE2eEnvironment({
        RWOS_RELEASE_SHA: sha,
        RWOS_NATIVE_E2E_CONFIRMATION: nativeE2eConfirmation,
        RWOS_NATIVE_PLATFORM: "ios",
        RWOS_NATIVE_BUILD_ID: "provider/ios/build-01",
        RWOS_NATIVE_DEVICE_ID: "physical-device-01",
        RWOS_NATIVE_APP_ID: "ca.residentworkforce.worker",
        RWOS_NATIVE_API_ORIGIN: "https://api.staging.example.test",
        RWOS_NATIVE_WORKER_EMAIL: "worker@example.test",
        RWOS_NATIVE_WORKER_PASSWORD: "secret",
        RWOS_NATIVE_RESET_AUTHORITY_ID: "provider/qa/reset-01",
        RWOS_NATIVE_RESET_ORIGIN: "https://qa-reset.staging.example.test",
        RWOS_NATIVE_RESET_TOKEN: "secret",
        RWOS_NATIVE_RESET_SERVICE_IDENTITY: "provider/service/native-runner-01",
        RWOS_NATIVE_RESET_OPERATOR_IDENTITY: "provider/operator/qa-owner-01",
        RWOS_NATIVE_RESET_PROJECT_ID: "provider/project/staging-01",
        RWOS_NATIVE_RESET_CLUSTER_ID: "provider/cluster/staging-01",
        RWOS_NATIVE_RESET_DATABASE_ID: "provider/database/staging-01",
        RWOS_NATIVE_RESET_NAMESPACE: "rwos:qa-reset:staging:v1",
        RWOS_NATIVE_RESET_MANIFEST_ID: "rwos-qa-reset-manifest-v1",
        RWOS_NATIVE_RESET_MANIFEST_CHECKSUM: "a".repeat(64),
        RWOS_NATIVE_RESET_DRY_RUN_APPROVAL_REFERENCE: "provider/approval/dry-run-01",
        RWOS_NATIVE_RESET_PREPARE_APPROVAL_REFERENCE: "provider/approval/prepare-01",
        RWOS_NATIVE_RESET_CLEANUP_APPROVAL_REFERENCE: "provider/approval/cleanup-01",
        RWOS_NATIVE_TENANT_ID: "tenant-a",
        RWOS_NATIVE_DEVICE_MODEL: "iPhone 17",
        RWOS_NATIVE_OS_VERSION: "iOS 20",
        RWOS_NATIVE_ARTIFACT_DIR: "tests/e2e/artifacts/native/ios",
        RWOS_NATIVE_SIGNED_BUILD: "true",
        RWOS_NATIVE_PHYSICAL_DEVICE: "true"
      })
    ).toEqual([]);
  });

  it("rejects incomplete native inputs", () => {
    expect(validateNativeE2eEnvironment({})).not.toEqual([]);
  });

  it("rejects a simulator or unsigned native build", () => {
    const invalid = {
      RWOS_RELEASE_SHA: sha,
      RWOS_NATIVE_E2E_CONFIRMATION: nativeE2eConfirmation,
      RWOS_NATIVE_PLATFORM: "android",
      RWOS_NATIVE_BUILD_ID: "provider/android/build-01",
      RWOS_NATIVE_DEVICE_ID: "device-01",
      RWOS_NATIVE_APP_ID: "ca.residentworkforce.worker",
      RWOS_NATIVE_API_ORIGIN: "https://api.staging.example.test",
      RWOS_NATIVE_WORKER_EMAIL: "worker@example.test",
      RWOS_NATIVE_WORKER_PASSWORD: "secret",
      RWOS_NATIVE_RESET_AUTHORITY_ID: "provider/qa/reset-01",
      RWOS_NATIVE_RESET_ORIGIN: "https://qa-reset.staging.example.test",
      RWOS_NATIVE_RESET_TOKEN: "secret",
      RWOS_NATIVE_RESET_SERVICE_IDENTITY: "provider/service/native-runner-01",
      RWOS_NATIVE_RESET_OPERATOR_IDENTITY: "provider/operator/qa-owner-01",
      RWOS_NATIVE_RESET_PROJECT_ID: "provider/project/staging-01",
      RWOS_NATIVE_RESET_CLUSTER_ID: "provider/cluster/staging-01",
      RWOS_NATIVE_RESET_DATABASE_ID: "provider/database/staging-01",
      RWOS_NATIVE_RESET_NAMESPACE: "rwos:qa-reset:staging:v1",
      RWOS_NATIVE_RESET_MANIFEST_ID: "rwos-qa-reset-manifest-v1",
      RWOS_NATIVE_RESET_MANIFEST_CHECKSUM: "a".repeat(64),
      RWOS_NATIVE_RESET_DRY_RUN_APPROVAL_REFERENCE: "provider/approval/dry-run-01",
      RWOS_NATIVE_RESET_PREPARE_APPROVAL_REFERENCE: "provider/approval/prepare-01",
      RWOS_NATIVE_RESET_CLEANUP_APPROVAL_REFERENCE: "provider/approval/cleanup-01",
      RWOS_NATIVE_TENANT_ID: "tenant-a",
      RWOS_NATIVE_DEVICE_MODEL: "emulator",
      RWOS_NATIVE_OS_VERSION: "Android 17",
      RWOS_NATIVE_ARTIFACT_DIR: "tests/e2e/artifacts/native/android",
      RWOS_NATIVE_SIGNED_BUILD: "false",
      RWOS_NATIVE_PHYSICAL_DEVICE: "false"
    };
    expect(validateNativeE2eEnvironment(invalid)).toEqual(
      expect.arrayContaining([
        "RWOS_NATIVE_SIGNED_BUILD must equal true.",
        "RWOS_NATIVE_PHYSICAL_DEVICE must equal true."
      ])
    );
  });
});
