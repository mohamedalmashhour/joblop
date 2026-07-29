import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { validateNativeE2eEnvironment } from "../tests/e2e/e2e-environment-policy";

void main();
let nativePreparationReceipt: string | null = null;

async function main() {
  const issues = validateNativeE2eEnvironment(process.env);
  if (issues.length) {
    for (const issue of issues) process.stderr.write(`NATIVE_E2E_INPUT_ERROR: ${issue}\n`);
    process.exit(1);
  }

  const artifactDir = resolve(process.env.RWOS_NATIVE_ARTIFACT_DIR!);
  mkdirSync(artifactDir, { recursive: true });
  await resetStaging("prepare");
  const result = spawnSync(
    "maestro",
    [
      "test",
      "--format",
      "junit",
      "--output",
      `${artifactDir}/maestro-results.xml`,
      "tests/e2e/native/worker-calendar.yaml"
    ],
    {
      stdio: "inherit",
      shell: false,
      env: process.env
    }
  );
  await resetStaging("cleanup");
  if (result.error) {
    process.stderr.write("NATIVE_E2E_RUNNER_UNAVAILABLE: Maestro is required.\n");
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  process.stdout.write(
    `NATIVE_E2E_PASS platform=${process.env.RWOS_NATIVE_PLATFORM} releaseSha=${process.env.RWOS_RELEASE_SHA} artifacts=${artifactDir}\n`
  );
}

async function resetStaging(action: "prepare" | "cleanup") {
  const dryRun = await resetRequest("dry-run", action, {});
  if (action === "prepare") {
    const prepared = await resetRequest("prepare", action, {
      dryRunChecksum: dryRun.planChecksum
    });
    nativePreparationReceipt = prepared.receipt;
    return;
  }
  if (!nativePreparationReceipt) throw new Error("NATIVE_E2E_RESET_PREPARATION_RECEIPT_MISSING");
  await resetRequest("cleanup", action, {
    dryRunChecksum: dryRun.planChecksum,
    preparationReceipt: nativePreparationReceipt
  });
}

async function resetRequest(
  operation: "dry-run" | "prepare" | "cleanup",
  action: "prepare" | "cleanup",
  extra: Record<string, string>
) {
  const approval =
    operation === "dry-run"
      ? process.env.RWOS_NATIVE_RESET_DRY_RUN_APPROVAL_REFERENCE
      : operation === "prepare"
        ? process.env.RWOS_NATIVE_RESET_PREPARE_APPROVAL_REFERENCE
        : process.env.RWOS_NATIVE_RESET_CLEANUP_APPROVAL_REFERENCE;
  const response = await fetch(
    new URL(`/v1/qa-reset/${operation}`, process.env.RWOS_NATIVE_RESET_ORIGIN),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RWOS_NATIVE_RESET_TOKEN}`,
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-rwos-service-id": process.env.RWOS_NATIVE_RESET_SERVICE_IDENTITY!,
        "x-rwos-operator-id": process.env.RWOS_NATIVE_RESET_OPERATOR_IDENTITY!,
        "x-rwos-operation": `qa-reset:${operation}`,
        "x-rwos-project-id": process.env.RWOS_NATIVE_RESET_PROJECT_ID!,
        "x-rwos-cluster-id": process.env.RWOS_NATIVE_RESET_CLUSTER_ID!,
        "x-rwos-database-id": process.env.RWOS_NATIVE_RESET_DATABASE_ID!,
        "x-rwos-authority-id": process.env.RWOS_NATIVE_RESET_AUTHORITY_ID!,
        "x-rwos-namespace": process.env.RWOS_NATIVE_RESET_NAMESPACE!,
        "x-rwos-release-sha": process.env.RWOS_RELEASE_SHA!,
        "x-rwos-manifest-id": process.env.RWOS_NATIVE_RESET_MANIFEST_ID!,
        "x-rwos-manifest-checksum": process.env.RWOS_NATIVE_RESET_MANIFEST_CHECKSUM!,
        "x-rwos-approval-reference": approval!
      },
      body: JSON.stringify({
        action,
        authorityId: process.env.RWOS_NATIVE_RESET_AUTHORITY_ID,
        tenantId: process.env.RWOS_NATIVE_TENANT_ID,
        releaseSha: process.env.RWOS_RELEASE_SHA,
        confirmation: "authorized-staging-native-e2e",
        ...extra
      })
    }
  );
  if (!response.ok) {
    throw new Error(
      `NATIVE_E2E_RESET_FAILED operation=${operation} action=${action} status=${response.status}`
    );
  }
  return (await response.json()) as { planChecksum: string; receipt: string };
}
