import { describe, expect, it } from "vitest";

import { validateExternalEvidence, type ExternalEvidenceGate } from "./launch-evidence-policy";

const releaseSha = "0123456789abcdef0123456789abcdef01234567";
const base = {
  releaseSha,
  runId: "run-01",
  environment: "staging",
  startedAt: "2026-07-28T00:00:00.000Z",
  completedAt: "2026-07-28T00:10:00.000Z"
};

const valid: Record<ExternalEvidenceGate, Record<string, unknown>> = {
  backup_pitr: {
    ...base,
    sourceClusterId: "provider/production/cluster-01",
    targetClusterId: "provider/recovery/cluster-02",
    backupJobId: "backup-01",
    restoreJobId: "restore-01",
    operator: "operator",
    reviewer: "reviewer",
    witness: "witness",
    rpoSeconds: 60,
    rtoSeconds: 300,
    verificationPassed: true,
    cleanupPassed: true
  },
  distributed_rate_limit: {
    ...base,
    serviceId: "provider/staging/limiter-01",
    replicaCount: 2,
    sharedCounterPassed: true,
    restartPersistencePassed: true,
    accountIsolationPassed: true,
    networkIsolationPassed: true,
    denial429Passed: true,
    outage503Passed: true,
    readinessRecoveryPassed: true
  },
  monitoring_incident: {
    ...base,
    pagingDestinationId: "provider/staging/paging-01",
    alertId: "alert-fired-01",
    resolvedAlertId: "alert-resolved-01",
    primaryOwner: "primary",
    secondaryOwner: "secondary",
    incidentCommander: "commander",
    incidentRecordId: "incident-01",
    firedAt: base.startedAt,
    deliveredAt: base.startedAt,
    acknowledgedAt: base.startedAt,
    escalatedAt: base.startedAt,
    resolvedAt: base.completedAt,
    postDrillApproved: true,
    closureApproved: true
  },
  accessibility: {
    ...base,
    accessibilityOwner: "owner",
    ownerApproved: true,
    records: ["employer_web", "admin_web", "worker_ios", "worker_android"].map((surface) => ({
      surface,
      tester: "tester",
      testedAt: base.completedAt,
      buildId: "provider/build/release-01",
      browserOrDevice: "browser-or-device",
      os: "supported-os",
      assistiveTechnology: "screen-reader",
      manualPassed: true,
      keyboardPassed: true,
      axePassed: true,
      assistiveTechnologyPassed: true,
      passed: true
    }))
  },
  native_e2e: {
    ...base,
    mobileQaOwner: "mobile QA",
    ownerApproved: true,
    records: ["ios", "android"].map((platform) => ({
      platform,
      signedBuild: true,
      physicalDevice: true,
      passed: true,
      cleanupPassed: true,
      buildId: `provider/${platform}/build-01`,
      deviceId: `provider/${platform}/device-01`,
      deviceModel: "physical device",
      os: "supported OS",
      runnerVersion: "maestro 2",
      artifactPath: `artifacts/${platform}.xml`
    }))
  },
  privacy_legal: {
    ...base,
    privacyOwner: "privacy",
    legalOwner: "legal",
    jurisdiction: "owner-approved jurisdiction",
    applicableLaw: "owner-approved applicable law",
    retentionApproved: true,
    deletionApproved: true,
    exportApproved: true,
    legalHoldApproved: true,
    backupExpiryApproved: true,
    exportTestPassed: true,
    deletionTestPassed: true,
    ownerApproved: true
  }
};

describe("external launch evidence policy", () => {
  for (const gate of Object.keys(valid) as ExternalEvidenceGate[]) {
    it(`accepts complete ${gate} evidence`, () => {
      expect(validateExternalEvidence(gate, valid[gate], releaseSha)).toEqual([]);
    });

    it(`fails ${gate} closed for missing evidence`, () => {
      expect(validateExternalEvidence(gate, {}, releaseSha)).not.toEqual([]);
    });
  }

  it("rejects evidence bound to another release", () => {
    expect(validateExternalEvidence("backup_pitr", valid.backup_pitr, "f".repeat(40))).toContain(
      "Evidence releaseSha must match RWOS_RELEASE_SHA."
    );
  });
});
