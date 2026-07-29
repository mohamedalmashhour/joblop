import { isFullReleaseSha, isImmutableExternalIdentity } from "../../scripts/evidence-policy";

export const browserE2eConfirmation = "authorized-staging-browser-e2e";
export const nativeE2eConfirmation = "authorized-staging-native-e2e";

export function validateBrowserE2eEnvironment(env: NodeJS.ProcessEnv) {
  const issues: string[] = [];
  const required = [
    "RWOS_RELEASE_SHA",
    "RWOS_E2E_EMPLOYER_ORIGIN",
    "RWOS_E2E_ADMIN_ORIGIN",
    "RWOS_E2E_WORKER_ORIGIN",
    "RWOS_E2E_EMPLOYER_EMAIL",
    "RWOS_E2E_EMPLOYER_PASSWORD",
    "RWOS_E2E_ADMIN_EMAIL",
    "RWOS_E2E_ADMIN_PASSWORD",
    "RWOS_E2E_WORKER_EMAIL",
    "RWOS_E2E_WORKER_PASSWORD",
    "RWOS_E2E_REVOKED_EMAIL",
    "RWOS_E2E_REVOKED_PASSWORD",
    "RWOS_E2E_RESET_ORIGIN",
    "RWOS_E2E_RESET_TOKEN",
    "RWOS_E2E_RESET_SERVICE_IDENTITY",
    "RWOS_E2E_RESET_OPERATOR_IDENTITY",
    "RWOS_E2E_RESET_PROJECT_ID",
    "RWOS_E2E_RESET_CLUSTER_ID",
    "RWOS_E2E_RESET_DATABASE_ID",
    "RWOS_E2E_RESET_AUTHORITY_ID",
    "RWOS_E2E_RESET_NAMESPACE",
    "RWOS_E2E_RESET_MANIFEST_ID",
    "RWOS_E2E_RESET_MANIFEST_CHECKSUM",
    "RWOS_E2E_RESET_DRY_RUN_APPROVAL_REFERENCE",
    "RWOS_E2E_RESET_PREPARE_APPROVAL_REFERENCE",
    "RWOS_E2E_RESET_CLEANUP_APPROVAL_REFERENCE",
    "RWOS_E2E_TENANT_A_ID",
    "RWOS_E2E_TENANT_B_ID"
  ] as const;
  for (const key of required) {
    if (!env[key]?.trim()) issues.push(`${key} is required.`);
  }
  if (env.RWOS_E2E_CONFIRMATION !== browserE2eConfirmation) {
    issues.push(`RWOS_E2E_CONFIRMATION must equal ${browserE2eConfirmation}.`);
  }
  if (env.RWOS_RELEASE_SHA && !isFullReleaseSha(env.RWOS_RELEASE_SHA)) {
    issues.push("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  }
  for (const key of [
    "RWOS_E2E_EMPLOYER_ORIGIN",
    "RWOS_E2E_ADMIN_ORIGIN",
    "RWOS_E2E_WORKER_ORIGIN",
    "RWOS_E2E_RESET_ORIGIN"
  ] as const) {
    if (env[key] && !isRemoteHttps(env[key])) issues.push(`${key} must be remote HTTPS.`);
  }
  if (env.RWOS_E2E_TENANT_A_ID && env.RWOS_E2E_TENANT_A_ID === env.RWOS_E2E_TENANT_B_ID) {
    issues.push("RWOS_E2E_TENANT_A_ID and RWOS_E2E_TENANT_B_ID must differ.");
  }
  validateResetAuthorityInputs(env, "RWOS_E2E_RESET", issues);
  return issues;
}

export function validateNativeE2eEnvironment(env: NodeJS.ProcessEnv) {
  const issues: string[] = [];
  const required = [
    "RWOS_RELEASE_SHA",
    "RWOS_NATIVE_PLATFORM",
    "RWOS_NATIVE_BUILD_ID",
    "RWOS_NATIVE_DEVICE_ID",
    "RWOS_NATIVE_APP_ID",
    "RWOS_NATIVE_API_ORIGIN",
    "RWOS_NATIVE_WORKER_EMAIL",
    "RWOS_NATIVE_WORKER_PASSWORD",
    "RWOS_NATIVE_RESET_AUTHORITY_ID",
    "RWOS_NATIVE_RESET_ORIGIN",
    "RWOS_NATIVE_RESET_TOKEN",
    "RWOS_NATIVE_RESET_SERVICE_IDENTITY",
    "RWOS_NATIVE_RESET_OPERATOR_IDENTITY",
    "RWOS_NATIVE_RESET_PROJECT_ID",
    "RWOS_NATIVE_RESET_CLUSTER_ID",
    "RWOS_NATIVE_RESET_DATABASE_ID",
    "RWOS_NATIVE_RESET_NAMESPACE",
    "RWOS_NATIVE_RESET_MANIFEST_ID",
    "RWOS_NATIVE_RESET_MANIFEST_CHECKSUM",
    "RWOS_NATIVE_RESET_DRY_RUN_APPROVAL_REFERENCE",
    "RWOS_NATIVE_RESET_PREPARE_APPROVAL_REFERENCE",
    "RWOS_NATIVE_RESET_CLEANUP_APPROVAL_REFERENCE",
    "RWOS_NATIVE_TENANT_ID",
    "RWOS_NATIVE_DEVICE_MODEL",
    "RWOS_NATIVE_OS_VERSION",
    "RWOS_NATIVE_ARTIFACT_DIR"
  ] as const;
  for (const key of required) {
    if (!env[key]?.trim()) issues.push(`${key} is required.`);
  }
  if (env.RWOS_NATIVE_E2E_CONFIRMATION !== nativeE2eConfirmation) {
    issues.push(`RWOS_NATIVE_E2E_CONFIRMATION must equal ${nativeE2eConfirmation}.`);
  }
  if (env.RWOS_RELEASE_SHA && !isFullReleaseSha(env.RWOS_RELEASE_SHA)) {
    issues.push("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  }
  if (env.RWOS_NATIVE_PLATFORM && !["ios", "android"].includes(env.RWOS_NATIVE_PLATFORM)) {
    issues.push("RWOS_NATIVE_PLATFORM must be ios or android.");
  }
  if (env.RWOS_NATIVE_API_ORIGIN && !isRemoteHttps(env.RWOS_NATIVE_API_ORIGIN)) {
    issues.push("RWOS_NATIVE_API_ORIGIN must be remote HTTPS.");
  }
  if (env.RWOS_NATIVE_RESET_ORIGIN && !isRemoteHttps(env.RWOS_NATIVE_RESET_ORIGIN)) {
    issues.push("RWOS_NATIVE_RESET_ORIGIN must be remote HTTPS.");
  }
  if (env.RWOS_NATIVE_SIGNED_BUILD !== "true") {
    issues.push("RWOS_NATIVE_SIGNED_BUILD must equal true.");
  }
  if (env.RWOS_NATIVE_PHYSICAL_DEVICE !== "true") {
    issues.push("RWOS_NATIVE_PHYSICAL_DEVICE must equal true.");
  }
  for (const key of ["RWOS_NATIVE_BUILD_ID", "RWOS_NATIVE_RESET_AUTHORITY_ID"] as const) {
    if (env[key] && !isImmutableExternalIdentity(env[key])) {
      issues.push(`${key} must be an immutable provider-qualified identity.`);
    }
  }
  validateResetAuthorityInputs(env, "RWOS_NATIVE_RESET", issues);
  return issues;
}

function validateResetAuthorityInputs(
  env: NodeJS.ProcessEnv,
  prefix: "RWOS_E2E_RESET" | "RWOS_NATIVE_RESET",
  issues: string[]
) {
  for (const suffix of [
    "SERVICE_IDENTITY",
    "OPERATOR_IDENTITY",
    "PROJECT_ID",
    "CLUSTER_ID",
    "DATABASE_ID",
    "AUTHORITY_ID",
    "DRY_RUN_APPROVAL_REFERENCE",
    "PREPARE_APPROVAL_REFERENCE",
    "CLEANUP_APPROVAL_REFERENCE"
  ] as const) {
    const key = `${prefix}_${suffix}`;
    if (env[key] && !isImmutableExternalIdentity(env[key]!)) {
      issues.push(`${key} must be an immutable provider-qualified identity.`);
    }
  }
  if (env[`${prefix}_NAMESPACE`] && env[`${prefix}_NAMESPACE`] !== "rwos:qa-reset:staging:v1") {
    issues.push(`${prefix}_NAMESPACE must equal rwos:qa-reset:staging:v1.`);
  }
  if (
    env[`${prefix}_MANIFEST_CHECKSUM`] &&
    !/^[a-f0-9]{64}$/.test(env[`${prefix}_MANIFEST_CHECKSUM`]!)
  ) {
    issues.push(`${prefix}_MANIFEST_CHECKSUM must be a lowercase SHA-256 checksum.`);
  }
}

function isRemoteHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);
  } catch {
    return false;
  }
}
