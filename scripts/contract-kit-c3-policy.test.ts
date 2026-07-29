import { describe, expect, it } from "vitest";

import { validateContractKitManifest } from "./contract-kit-c3-policy";

const valid = {
  version: "v1.1",
  sourceCommit: "0123456789abcdef0123456789abcdef01234567",
  releaseSha: "89abcdef0123456789abcdef0123456789abcdef",
  contractOwner: "Platform Contract Owner",
  provenance: {
    issuer: "Platform Contract Authority",
    artifactId: "provider/contracts/v1.1/export-01"
  },
  signature: {
    signer: "Platform Contract Owner",
    algorithm: "ed25519",
    verified: true
  },
  ownerApproval: {
    owner: "Platform Contract Owner",
    approvedAt: "2026-07-28T00:00:00.000Z",
    approved: true
  },
  c3: {
    executable: true,
    executed: true,
    passed: true,
    resultArtifact: "evidence/c3-result.json",
    explicitCurrency: true,
    integerMinorUnits: true,
    unsupportedPrecisionRejected: true,
    mixedCurrencyRejected: true,
    safeErrors: true
  },
  files: [
    { path: "contracts/VERSION", sha256: "a".repeat(64) },
    { path: "contracts/conformance/c3.test.mjs", sha256: "b".repeat(64) }
  ]
};

describe("Contract Kit C3 v1.1 intake policy", () => {
  it("accepts a complete immutable manifest", () => {
    expect(validateContractKitManifest(valid)).toEqual([]);
  });

  it("rejects relabelled or incomplete input", () => {
    expect(validateContractKitManifest({ ...valid, version: "v1", c3: {} })).toEqual(
      expect.arrayContaining([
        "Contract Kit manifest version must be v1.1.",
        "Contract Kit C3 must be declared executable."
      ])
    );
  });

  it("rejects unsigned, unapproved, unexecuted, or unbound input", () => {
    expect(
      validateContractKitManifest({
        ...valid,
        releaseSha: undefined,
        signature: undefined,
        ownerApproval: undefined,
        provenance: undefined,
        c3: { ...valid.c3, executed: false }
      })
    ).toEqual(
      expect.arrayContaining([
        "Contract Kit releaseSha must be a full lowercase 40-character Git SHA.",
        "Contract Kit provenance requires issuer and immutable artifactId.",
        "Contract Kit signature requires a named signer, algorithm, and verified=true.",
        "Contract Kit ownerApproval requires a named owner, timestamp, and approved=true.",
        "Contract Kit C3 requires executed=true, passed=true, and a resultArtifact reference."
      ])
    );
  });

  it("rejects unsafe paths, duplicates and invalid checksums", () => {
    expect(
      validateContractKitManifest({
        ...valid,
        files: [
          { path: "../VERSION", sha256: "bad" },
          { path: "../VERSION", sha256: "bad" }
        ]
      })
    ).not.toEqual([]);
  });
});
