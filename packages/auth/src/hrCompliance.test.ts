import { describe, expect, it } from "vitest";
import {
  createComplianceEvaluator,
  type ComplianceEvidence,
  type ComplianceRequirementRecord
} from "./hrCompliance";

function evaluator(reqs: ComplianceRequirementRecord[], evidence: ComplianceEvidence) {
  return createComplianceEvaluator({
    requirements: { async applicable() { return reqs; } },
    evidence: { async read() { return evidence; } },
    now: () => new Date("2026-08-11T00:00:00.000Z")
  });
}

const req = (over: Partial<ComplianceRequirementRecord>): ComplianceRequirementRecord => ({
  id: "r", key: "qc_healthcare_doc", jurisdiction: "CA-QC", roleCategory: "healthcare", worksiteRef: null,
  requiredDocumentType: "work_authorization", requiredCredentialType: null, ...over
});

describe("compliance evaluator", () => {
  it("no requirements → compliant", async () => {
    const e = await evaluator([], { documents: [], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" });
    expect(e.result).toBe("compliant");
    expect(e.reasons).toEqual([]);
  });

  it("missing required document → non_compliant with a structured reason", async () => {
    const e = await evaluator([req({})], { documents: [], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC", roleCategory: "healthcare" });
    expect(e.result).toBe("non_compliant");
    expect(e.reasons[0]).toMatchObject({ requirementKey: "qc_healthcare_doc", requiredType: "work_authorization", satisfied: false, detail: "missing" });
  });

  it("accepted document → compliant; expiring → expiring_soon; under review → review_required", async () => {
    expect((await evaluator([req({})], { documents: [{ documentType: "work_authorization", effectiveStatus: "accepted" }], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" })).result).toBe("compliant");
    expect((await evaluator([req({})], { documents: [{ documentType: "work_authorization", effectiveStatus: "expiring" }], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" })).result).toBe("expiring_soon");
    expect((await evaluator([req({})], { documents: [{ documentType: "work_authorization", effectiveStatus: "under_review" }], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" })).result).toBe("review_required");
  });

  it("rejected → action_required; expired → non_compliant", async () => {
    expect((await evaluator([req({})], { documents: [{ documentType: "work_authorization", effectiveStatus: "rejected" }], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" })).result).toBe("action_required");
    expect((await evaluator([req({})], { documents: [{ documentType: "work_authorization", effectiveStatus: "expired" }], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" })).result).toBe("non_compliant");
  });

  it("credential requirement is evaluated too; worst-of aggregation wins", async () => {
    const reqs = [req({ key: "doc", requiredDocumentType: "work_authorization", requiredCredentialType: null }), req({ key: "cred", requiredDocumentType: null, requiredCredentialType: "first_aid" })];
    // doc accepted (compliant) + credential missing (non_compliant) → overall non_compliant
    const e = await evaluator(reqs, { documents: [{ documentType: "work_authorization", effectiveStatus: "accepted" }], credentials: [] }).evaluateWorkerCompliance({ workerIdentityId: "w", jurisdiction: "CA-QC" });
    expect(e.result).toBe("non_compliant");
    expect(e.reasons).toHaveLength(2);
    expect(e.reasons.find((r) => r.kind === "credential")).toMatchObject({ satisfied: false, detail: "missing" });
  });
});
