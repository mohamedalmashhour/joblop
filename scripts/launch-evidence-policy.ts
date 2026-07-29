import { isFullReleaseSha, isImmutableExternalIdentity } from "./evidence-policy";

export const externalEvidenceGates = [
  "backup_pitr",
  "distributed_rate_limit",
  "monitoring_incident",
  "accessibility",
  "native_e2e",
  "privacy_legal"
] as const;

export type ExternalEvidenceGate = (typeof externalEvidenceGates)[number];
type EvidenceRecord = Readonly<Record<string, unknown>>;

export function validateExternalEvidence(
  gate: ExternalEvidenceGate,
  evidence: EvidenceRecord,
  expectedReleaseSha: string | undefined
) {
  const issues: string[] = [];
  const releaseSha = readString(evidence, "releaseSha");
  if (!isFullReleaseSha(expectedReleaseSha)) {
    issues.push("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  }
  if (!releaseSha || releaseSha !== expectedReleaseSha) {
    issues.push("Evidence releaseSha must match RWOS_RELEASE_SHA.");
  }
  if (!readString(evidence, "runId")) issues.push("Evidence runId is required.");
  if (!readTimestamp(evidence, "startedAt") || !readTimestamp(evidence, "completedAt")) {
    issues.push("Evidence requires valid startedAt and completedAt timestamps.");
  }
  if (!readString(evidence, "environment") || evidence.environment === "local") {
    issues.push("Evidence environment must identify a non-local target.");
  }

  if (gate === "backup_pitr") validateBackupEvidence(evidence, issues);
  if (gate === "distributed_rate_limit") validateLimiterEvidence(evidence, issues);
  if (gate === "monitoring_incident") validateMonitoringEvidence(evidence, issues);
  if (gate === "accessibility") validateAccessibilityEvidence(evidence, issues);
  if (gate === "native_e2e") validateNativeE2eEvidence(evidence, issues);
  if (gate === "privacy_legal") validatePrivacyEvidence(evidence, issues);
  return issues;
}

function validateBackupEvidence(evidence: EvidenceRecord, issues: string[]) {
  const source = readString(evidence, "sourceClusterId");
  const target = readString(evidence, "targetClusterId");
  if (!isImmutableExternalIdentity(source)) issues.push("sourceClusterId is not immutable.");
  if (!isImmutableExternalIdentity(target)) issues.push("targetClusterId is not immutable.");
  if (source && source === target) issues.push("Backup source and restore target must differ.");
  for (const key of ["backupJobId", "restoreJobId", "operator", "reviewer", "witness"] as const) {
    if (!readString(evidence, key)) issues.push(`${key} is required.`);
  }
  for (const key of ["rpoSeconds", "rtoSeconds"] as const) {
    if (!isFiniteNonNegative(evidence[key]))
      issues.push(`${key} must be a finite non-negative number.`);
  }
  for (const key of ["verificationPassed", "cleanupPassed"] as const) {
    if (evidence[key] !== true) issues.push(`${key} must be true.`);
  }
}

function validateLimiterEvidence(evidence: EvidenceRecord, issues: string[]) {
  if (!isImmutableExternalIdentity(readString(evidence, "serviceId"))) {
    issues.push("serviceId must be an immutable provider-qualified identity.");
  }
  if (typeof evidence.replicaCount !== "number" || evidence.replicaCount < 2) {
    issues.push("replicaCount must be at least two.");
  }
  for (const key of [
    "sharedCounterPassed",
    "restartPersistencePassed",
    "accountIsolationPassed",
    "networkIsolationPassed",
    "denial429Passed",
    "outage503Passed",
    "readinessRecoveryPassed"
  ] as const) {
    if (evidence[key] !== true) issues.push(`${key} must be true.`);
  }
}

function validateMonitoringEvidence(evidence: EvidenceRecord, issues: string[]) {
  if (!isImmutableExternalIdentity(readString(evidence, "pagingDestinationId"))) {
    issues.push("pagingDestinationId must be an immutable provider-qualified identity.");
  }
  for (const key of [
    "alertId",
    "resolvedAlertId",
    "primaryOwner",
    "secondaryOwner",
    "incidentCommander",
    "incidentRecordId"
  ] as const) {
    if (!readString(evidence, key)) issues.push(`${key} is required.`);
  }
  const timelineKeys = [
    "firedAt",
    "deliveredAt",
    "acknowledgedAt",
    "escalatedAt",
    "resolvedAt"
  ] as const;
  for (const key of timelineKeys) {
    if (!readTimestamp(evidence, key)) issues.push(`${key} must be a valid timestamp.`);
  }
  const timeline = timelineKeys.map((key) => readTimestamp(evidence, key));
  if (
    timeline.every((value): value is string => Boolean(value)) &&
    timeline.some(
      (value, index) => index > 0 && Date.parse(value) < Date.parse(timeline[index - 1])
    )
  ) {
    issues.push(
      "Monitoring timestamps must follow fired, delivered, acknowledged, escalated, resolved order."
    );
  }
  if (evidence.postDrillApproved !== true) issues.push("postDrillApproved must be true.");
  if (evidence.closureApproved !== true) issues.push("closureApproved must be true.");
}

function validateAccessibilityEvidence(evidence: EvidenceRecord, issues: string[]) {
  const records = Array.isArray(evidence.records) ? evidence.records : [];
  const required = new Set(["employer_web", "admin_web", "worker_ios", "worker_android"]);
  for (const candidate of records) {
    if (!isRecord(candidate)) continue;
    const surface = readString(candidate, "surface");
    const isWeb = surface === "employer_web" || surface === "admin_web";
    const complete =
      candidate.passed === true &&
      Boolean(readString(candidate, "tester")) &&
      Boolean(readString(candidate, "testedAt")) &&
      Boolean(readString(candidate, "buildId")) &&
      Boolean(readString(candidate, "browserOrDevice")) &&
      Boolean(readString(candidate, "os")) &&
      Boolean(readString(candidate, "assistiveTechnology")) &&
      candidate.manualPassed === true &&
      candidate.assistiveTechnologyPassed === true &&
      (!isWeb || (candidate.keyboardPassed === true && candidate.axePassed === true));
    if (surface && complete) {
      required.delete(surface);
    }
  }
  if (required.size)
    issues.push(`Accessibility records missing: ${[...required].sort().join(", ")}.`);
  if (!readString(evidence, "accessibilityOwner") || evidence.ownerApproved !== true) {
    issues.push("Named accessibility owner approval is required.");
  }
}

function validateNativeE2eEvidence(evidence: EvidenceRecord, issues: string[]) {
  const records = Array.isArray(evidence.records) ? evidence.records : [];
  const required = new Set(["ios", "android"]);
  for (const candidate of records) {
    if (!isRecord(candidate)) continue;
    const platform = readString(candidate, "platform");
    if (
      platform &&
      candidate.signedBuild === true &&
      candidate.physicalDevice === true &&
      candidate.passed === true &&
      candidate.cleanupPassed === true &&
      Boolean(readString(candidate, "buildId")) &&
      Boolean(readString(candidate, "deviceId")) &&
      Boolean(readString(candidate, "deviceModel")) &&
      Boolean(readString(candidate, "os")) &&
      Boolean(readString(candidate, "runnerVersion")) &&
      Boolean(readString(candidate, "artifactPath"))
    ) {
      required.delete(platform);
    }
  }
  if (required.size) issues.push(`Native E2E records missing: ${[...required].sort().join(", ")}.`);
  if (!readString(evidence, "mobileQaOwner") || evidence.ownerApproved !== true) {
    issues.push("Named Mobile QA owner approval is required.");
  }
}

function validatePrivacyEvidence(evidence: EvidenceRecord, issues: string[]) {
  for (const key of ["privacyOwner", "legalOwner", "jurisdiction", "applicableLaw"] as const) {
    if (!readString(evidence, key)) issues.push(`${key} is required.`);
  }
  for (const key of [
    "retentionApproved",
    "deletionApproved",
    "exportApproved",
    "legalHoldApproved",
    "backupExpiryApproved",
    "exportTestPassed",
    "deletionTestPassed",
    "ownerApproved"
  ] as const) {
    if (evidence[key] !== true) issues.push(`${key} must be true.`);
  }
}

function readString(record: EvidenceRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readTimestamp(record: EvidenceRecord, key: string) {
  const value = readString(record, key);
  return value && !Number.isNaN(Date.parse(value)) ? value : undefined;
}

function isFiniteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is EvidenceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
