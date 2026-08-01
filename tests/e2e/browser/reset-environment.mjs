import process from "node:process";
import { URL } from "node:url";

let preparationReceipt = null;

export async function resetBrowserEnvironment(action) {
  const dryRun = await request("dry-run", action, {});
  if (action === "prepare") {
    const prepared = await request("prepare", action, {
      dryRunChecksum: dryRun.planChecksum
    });
    preparationReceipt = prepared.receipt;
    return;
  }
  if (!preparationReceipt) throw new Error("BROWSER_E2E_RESET_PREPARATION_RECEIPT_MISSING");
  await request("cleanup", action, {
    dryRunChecksum: dryRun.planChecksum,
    preparationReceipt
  });
}

async function request(operation, action, extra) {
  const approval =
    operation === "dry-run"
      ? process.env.RWOS_E2E_RESET_DRY_RUN_APPROVAL_REFERENCE
      : operation === "prepare"
        ? process.env.RWOS_E2E_RESET_PREPARE_APPROVAL_REFERENCE
        : process.env.RWOS_E2E_RESET_CLEANUP_APPROVAL_REFERENCE;
  const response = await globalThis.fetch(
    new URL(`/v1/qa-reset/${operation}`, process.env.RWOS_E2E_RESET_ORIGIN),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RWOS_E2E_RESET_TOKEN}`,
        "x-rwos-app-authorization": `Bearer ${process.env.RWOS_E2E_RESET_APP_CREDENTIAL}`,
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-rwos-service-id": process.env.RWOS_E2E_RESET_SERVICE_IDENTITY,
        "x-rwos-operator-id": process.env.RWOS_E2E_RESET_OPERATOR_IDENTITY,
        "x-rwos-operation": `qa-reset:${operation}`,
        "x-rwos-environment": "staging",
        "x-rwos-project-id": process.env.RWOS_E2E_RESET_PROJECT_ID,
        "x-rwos-cluster-id": process.env.RWOS_E2E_RESET_CLUSTER_ID,
        "x-rwos-database-id": process.env.RWOS_E2E_RESET_DATABASE_ID,
        "x-rwos-authority-id": process.env.RWOS_E2E_RESET_AUTHORITY_ID,
        "x-rwos-namespace": process.env.RWOS_E2E_RESET_NAMESPACE,
        "x-rwos-release-sha": process.env.RWOS_RELEASE_SHA,
        "x-rwos-manifest-id": process.env.RWOS_E2E_RESET_MANIFEST_ID,
        "x-rwos-manifest-checksum": process.env.RWOS_E2E_RESET_MANIFEST_CHECKSUM,
        "x-rwos-approval-reference": approval
      },
      body: JSON.stringify({
        action,
        tenantIds: [process.env.RWOS_E2E_TENANT_A_ID, process.env.RWOS_E2E_TENANT_B_ID],
        releaseSha: process.env.RWOS_RELEASE_SHA,
        confirmation: "authorized-staging-browser-e2e",
        ...extra
      })
    }
  );
  if (!response.ok) {
    throw new Error(
      `BROWSER_E2E_RESET_FAILED operation=${operation} action=${action} status=${response.status}`
    );
  }
  return response.json();
}
