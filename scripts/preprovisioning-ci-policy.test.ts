import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflowPath = ".github/workflows/validation.yml";

describe("non-provisioning CI policy", () => {
  it("pins trusted actions and validates Terraform without a backend or plan/apply", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    for (const sha of [
      "34e114876b0b11c390a56381ad16ebd13914f8d5",
      "9fd676a19091d4595eefd76e4bd31c97133911f1",
      "49933ea5288caeca8642d1e84afbd3f7d6820020",
      "dfe3c3f87815947d99a8997f908cb6525fc44e9e"
    ]) {
      expect(workflow).toContain(`@${sha}`);
    }
    expect(workflow).toContain("terraform_version: 1.10.5");
    expect(workflow).toContain("fmt -check -diff");
    expect(workflow).toContain("init -backend=false -input=false");
    expect(workflow).toContain("validate -no-color");
    expect(workflow).not.toMatch(/terraform .*\b(?:plan|apply|destroy)\b/u);
  });

  it("builds and probes every exact container target without a push or registry login", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    for (const service of [
      "api",
      "employer",
      "admin",
      "worker",
      "auth-limiter",
      "candidate-source",
      "offer-delivery",
      "qa-reset"
    ]) {
      expect(workflow).toContain(`- ${service}`);
    }
    expect(workflow).toContain("RWOS_CONTAINER_SERVICE: ${{ matrix.service }}");
    expect(workflow).toContain("RWOS_CONTAINER_BUILD_TIMESTAMP: ${{ steps.metadata.outputs.timestamp }}");
    expect(workflow).toContain("node scripts/validate-containers.mjs");
    expect(workflow).not.toMatch(/docker\s+(?:push|login)/u);
    expect(workflow).not.toMatch(/artifactregistry|gcloud/u);
  });

  it("limits the approved dependency disclosure to the registry advisory calls", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    expect(workflow).toContain("pnpm audit && pnpm audit --prod");
    expect(workflow).not.toMatch(/(?:^|\s)npm audit/u);
    expect(workflow).not.toMatch(/snyk|dependabot|socket|osv-scanner/u);
  });
});
