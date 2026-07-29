import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ownedEntityTypes } from "./manifest";
import { approvedTableForEntity, createExactMutationPlan } from "./mutationPlan";
import { testManifest } from "./testFixture";

const runbook = readFileSync(
  fileURLToPath(new URL("../../../docs/runbooks/STAGING_QA_RESET_SERVICE.md", import.meta.url)),
  "utf8"
);
const decisionPackage = readFileSync(
  fileURLToPath(
    new URL("../../../docs/architecture/QA_RESET_DATABASE_DECISION_PACKAGE.md", import.meta.url)
  ),
  "utf8"
);

describe("QA-reset local completion evidence", () => {
  it("keeps the completed fixture and mutation-plan scope machine checked", () => {
    expect(ownedEntityTypes).toHaveLength(24);
    expect(new Set(testManifest.records.map((record) => record.entityType))).toEqual(
      new Set(ownedEntityTypes)
    );
    expect(createExactMutationPlan(testManifest, "prepare")).toHaveLength(
      testManifest.records.length
    );
    expect(
      ownedEntityTypes.every((entityType) => /^[a-z_]+$/u.test(approvedTableForEntity(entityType)))
    ).toBe(true);
  });

  it("keeps human-facing terminology and the external execution boundary explicit", () => {
    const evidence = `${runbook}\n${decisionPackage}`;
    expect(evidence).toContain("Test Employer Organization A");
    expect(evidence).toContain("Test Employer Organization B");
    expect(evidence).toContain("EXTERNAL READINESS UNCLAIMED");
    expect(evidence).toContain("does not authorize an external database connection");
    expect(evidence).not.toContain("Application-payload contract still required");
    expect(evidence).not.toContain("existing manifest does not contain enough approved data");
  });
});
