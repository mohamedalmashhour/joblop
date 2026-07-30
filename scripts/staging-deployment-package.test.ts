import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const packagePath = "docs/runbooks/STAGING_DEPLOYMENT_PACKAGE_2026-07-30.md";
const fixturePath = "docs/evidence/STAGING_SYNTHETIC_FIXTURE_BLUEPRINT_2026-07-30.json";

describe("staging deployment package", () => {
  it("keeps every external action unauthorized and maps every policy gate", async () => {
    const body = await readFile(packagePath, "utf8");
    expect(body).toContain("PACKAGE COMPLETE — DEPLOYMENT NOT AUTHORIZED");
    expect(body).toContain("LOCAL READY");
    expect(body).not.toContain("STAGING READY");
    for (let index = 1; index <= 9; index += 1) {
      expect(body).toContain(`D${index}`);
    }
    for (const required of [
      "Exact GCP staging project ID",
      "Maximum monthly staging spend",
      "WIF",
      "Stripe test",
      "backup",
      "PITR",
      "rollback",
      "first-admin",
      "Organization A/B"
    ]) {
      expect(body).toContain(required);
    }
  });

  it("defines deterministic synthetic identities without claiming current seeding", async () => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
      classification: string;
      syntheticDataOnly: boolean;
      organizations: Array<Record<string, unknown>>;
      currentQaResetCoverage: { notCurrentlySeeded: string[] };
    };
    expect(fixture.classification).toBe("planning_only_not_seeded");
    expect(fixture.syntheticDataOnly).toBe(true);
    expect(fixture.organizations.map((organization) => organization.displayName)).toEqual([
      "Test Employer Organization A",
      "Test Employer Organization B"
    ]);
    expect(new Set(fixture.organizations.map((organization) => organization.organizationId)).size).toBe(2);
    expect(fixture.currentQaResetCoverage.notCurrentlySeeded).toContain("invoice");
    expect(fixture.currentQaResetCoverage.notCurrentlySeeded).toContain("payment attempt");
  });
});
