import { isFullReleaseSha } from "./evidence-policy";

export type ContractKitManifest = Readonly<{
  version?: unknown;
  sourceCommit?: unknown;
  releaseSha?: unknown;
  contractOwner?: unknown;
  provenance?: unknown;
  signature?: unknown;
  ownerApproval?: unknown;
  files?: unknown;
  c3?: unknown;
}>;

export function validateContractKitManifest(manifest: ContractKitManifest) {
  const issues: string[] = [];
  if (manifest.version !== "v1.1") issues.push("Contract Kit manifest version must be v1.1.");
  if (typeof manifest.sourceCommit !== "string" || !isFullReleaseSha(manifest.sourceCommit)) {
    issues.push("Contract Kit sourceCommit must be a full lowercase 40-character Git SHA.");
  }
  if (typeof manifest.releaseSha !== "string" || !isFullReleaseSha(manifest.releaseSha)) {
    issues.push("Contract Kit releaseSha must be a full lowercase 40-character Git SHA.");
  }
  if (typeof manifest.contractOwner !== "string" || !manifest.contractOwner.trim()) {
    issues.push("Contract Kit contractOwner is required.");
  }
  if (
    !isRecord(manifest.provenance) ||
    typeof manifest.provenance.issuer !== "string" ||
    !manifest.provenance.issuer.trim() ||
    typeof manifest.provenance.artifactId !== "string" ||
    !manifest.provenance.artifactId.trim()
  ) {
    issues.push("Contract Kit provenance requires issuer and immutable artifactId.");
  }
  if (
    !isRecord(manifest.signature) ||
    manifest.signature.verified !== true ||
    typeof manifest.signature.signer !== "string" ||
    !manifest.signature.signer.trim() ||
    typeof manifest.signature.algorithm !== "string" ||
    !manifest.signature.algorithm.trim()
  ) {
    issues.push("Contract Kit signature requires a named signer, algorithm, and verified=true.");
  }
  if (
    !isRecord(manifest.ownerApproval) ||
    manifest.ownerApproval.approved !== true ||
    typeof manifest.ownerApproval.owner !== "string" ||
    !manifest.ownerApproval.owner.trim() ||
    typeof manifest.ownerApproval.approvedAt !== "string" ||
    Number.isNaN(Date.parse(manifest.ownerApproval.approvedAt))
  ) {
    issues.push("Contract Kit ownerApproval requires a named owner, timestamp, and approved=true.");
  }
  if (!isRecord(manifest.c3) || manifest.c3.executable !== true) {
    issues.push("Contract Kit C3 must be declared executable.");
  } else {
    for (const key of [
      "explicitCurrency",
      "integerMinorUnits",
      "unsupportedPrecisionRejected",
      "mixedCurrencyRejected",
      "safeErrors"
    ] as const) {
      if (manifest.c3[key] !== true) issues.push(`Contract Kit C3 ${key} must be true.`);
    }
    if (
      manifest.c3.executed !== true ||
      manifest.c3.passed !== true ||
      typeof manifest.c3.resultArtifact !== "string" ||
      !manifest.c3.resultArtifact.trim()
    ) {
      issues.push(
        "Contract Kit C3 requires executed=true, passed=true, and a resultArtifact reference."
      );
    }
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    issues.push("Contract Kit manifest files are required.");
  } else {
    const paths = new Set<string>();
    for (const candidate of manifest.files) {
      if (!isRecord(candidate)) {
        issues.push("Each Contract Kit file record must be an object.");
        continue;
      }
      const path = candidate.path;
      const sha256 = candidate.sha256;
      if (
        typeof path !== "string" ||
        !path ||
        path.startsWith("/") ||
        path.split("/").includes("..")
      ) {
        issues.push("Contract Kit file paths must be safe relative paths.");
      } else if (paths.has(path)) {
        issues.push(`Contract Kit file path is duplicated: ${path}.`);
      } else {
        paths.add(path);
      }
      if (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256)) {
        issues.push(`Contract Kit file checksum is invalid: ${String(path)}.`);
      }
    }
    if (![...paths].some((path) => /(?:^|\/)VERSION$/.test(path))) {
      issues.push("Contract Kit manifest must include VERSION.");
    }
    if (![...paths].some((path) => /c3/i.test(path))) {
      issues.push("Contract Kit manifest must include an executable C3 artifact.");
    }
  }
  return issues;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
