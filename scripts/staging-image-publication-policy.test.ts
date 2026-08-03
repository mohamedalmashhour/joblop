import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = ".github/workflows/publish-staging-images.yml";
const workflow = readFileSync(workflowPath, "utf8");
const matrix = JSON.parse(readFileSync("container-build-matrix.json", "utf8")) as {
  services: Array<{ name: string; dockerfile: string }>;
};

describe("staging image publication workflow policy", () => {
  it("is manual, staging-gated and incapable of deployment", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("PUBLISH_EIGHT_IMAGES_NO_DEPLOY");
    expect(workflow).toContain("deployed: false");
    expect(workflow).not.toMatch(/gcloud run deploy|terraform apply|kubectl apply/);
  });

  it("uses short-lived WIF credentials and immutable action references", () => {
    expect(workflow).toContain("permissions:\n  contents: read\n  id-token: write");
    expect(workflow).toContain(
      "projects/800188428439/locations/global/workloadIdentityPools/rwos-staging-github/providers/github"
    );
    expect(workflow).toContain(
      "sa-rwos-stg-publisher@resident-workforce-os-staging.iam.gserviceaccount.com"
    );
    expect(workflow).not.toMatch(/uses:\s+[^\s]+@(v\d+|main|master)\b/);
  });

  it("publishes exactly the eight container-matrix services", () => {
    expect(matrix.services).toHaveLength(8);
    for (const service of matrix.services) {
      expect(workflow).toContain(`service: ${service.name}`);
      expect(workflow).toContain(`dockerfile: ${service.dockerfile}`);
    }
    expect(workflow).toContain('test "${#digest_files[@]}" = "8"');
    expect(workflow).toContain("@sha256:[a-f0-9]{64}");
  });

  it("binds builds and evidence to the exact authorized SHA", () => {
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$RELEASE_SHA"');
    expect(workflow).toContain('git merge-base --is-ancestor "$RELEASE_SHA" origin/main');
    expect(workflow).toContain("org.opencontainers.image.revision=${RELEASE_SHA}");
    expect(workflow).toContain("approvalReference: $approvalReference");
  });
});
