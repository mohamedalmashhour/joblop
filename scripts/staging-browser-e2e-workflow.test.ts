import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflowPath = ".github/workflows/staging-browser-e2e.yml";

describe("staging browser E2E workflow", () => {
  it("uses one exact-release keyless staging identity without persistent credentials", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow.match(/id-token: write/gu)).toHaveLength(1);
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("RUN_STAGING_BROWSER_E2E_ONCE");
    expect(workflow).toContain("sa-rwos-stg-browser-e2e@");
    expect(workflow).toContain("token_format: id_token");
    expect(workflow).toContain("id_token_audience: ${{ env.QA_RESET_AUDIENCE }}");
    expect(workflow).toContain("create_credentials_file: false");
    expect(workflow).toContain("export_environment_variables: false");
    expect(workflow).toContain("RWOS_E2E_RESET_TOKEN: ${{ steps.google-auth.outputs.id_token }}");
    expect(workflow).toContain('git merge-base --is-ancestor "$RELEASE_SHA" HEAD');
    expect(workflow).toContain('git checkout --detach "$RELEASE_SHA"');
    expect(workflow).toContain("git rev-parse HEAD");
    expect(workflow).not.toContain("serviceAccountTokenCreator");
    expect(workflow).not.toContain("gcloud auth");
    expect(workflow).not.toContain("private_key");
  });

  it("keeps credentials in protected staging environment secrets", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    for (const name of [
      "RWOS_E2E_EMPLOYER_EMAIL",
      "RWOS_E2E_EMPLOYER_PASSWORD",
      "RWOS_E2E_ADMIN_EMAIL",
      "RWOS_E2E_ADMIN_PASSWORD",
      "RWOS_E2E_WORKER_EMAIL",
      "RWOS_E2E_WORKER_PASSWORD",
      "RWOS_E2E_REVOKED_EMAIL",
      "RWOS_E2E_REVOKED_PASSWORD",
      "RWOS_E2E_RESET_APP_CREDENTIAL"
    ]) {
      expect(workflow).toContain(`secrets.${name}`);
    }
    expect(workflow).not.toMatch(/(?:password|credential):\s*["']?[^$\s]/iu);
  });
});
