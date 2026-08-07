import process from "node:process";
import { readFileSync, writeFileSync } from "node:fs";
import { URL } from "node:url";

let preparationReceipt = null;

export async function resetBrowserEnvironment(action) {
  const dryRun = await request("dry-run", action, {});
  if (action === "prepare") {
    const prepared = await request("prepare", action, {
      dryRunChecksum: dryRun.planChecksum
    });
    preparationReceipt = prepared.receipt;
    persistReceipt(prepared.receipt);
    return;
  }
  // prepare and cleanup run as separate CI steps (separate processes), so the receipt is handed
  // across via RWOS_E2E_RECEIPT_FILE; the in-process value is the fallback for a single-process run.
  const receipt = preparationReceipt ?? loadReceipt();
  if (!receipt) throw new Error("BROWSER_E2E_RESET_PREPARATION_RECEIPT_MISSING");
  await request("cleanup", action, {
    dryRunChecksum: dryRun.planChecksum,
    preparationReceipt: receipt
  });
}

function persistReceipt(receipt) {
  const file = process.env.RWOS_E2E_RECEIPT_FILE;
  if (file) writeFileSync(file, receipt, { encoding: "utf8", mode: 0o600 });
}

function loadReceipt() {
  const file = process.env.RWOS_E2E_RECEIPT_FILE;
  if (!file) return null;
  try {
    return readFileSync(file, "utf8").trim() || null;
  } catch {
    return null;
  }
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
