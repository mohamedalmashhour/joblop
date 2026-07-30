import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const root = "infrastructure/staging";
const read = (name: string) => readFile(`${root}/${name}`, "utf8");

describe("staging infrastructure package", () => {
  it("is complete, staging-only, Toronto-bound and input-gated", async () => {
    expect((await readdir(root)).sort()).toEqual([
      "main.tf",
      "outputs.tf",
      "terraform.tfvars.example",
      "variables.tf",
      "versions.tf"
    ]);
    const variables = await read("variables.tf");
    expect(variables).toContain('var.environment == "staging"');
    expect(variables).toContain('var.region == "northamerica-northeast2"');
    expect(variables).toContain("deployment_authorization_reference");
    expect(variables).toContain("maximum_monthly_budget_amount");
    expect(variables).toContain("project_number");
    expect(variables).toContain("@sha256:[a-f0-9]{64}");
    expect(variables).toContain("deletion_protection");
  });

  it("defines only reviewed staging resources and no billing attachment", async () => {
    const main = await read("main.tf");
    for (const resource of [
      "google_compute_network",
      "google_compute_subnetwork",
      "google_artifact_registry_repository",
      "google_sql_database_instance",
      "google_redis_instance",
      "google_secret_manager_secret",
      "google_cloud_run_v2_service",
      "google_iam_workload_identity_pool_provider"
    ]) {
      expect(main).toContain(`resource "${resource}"`);
    }
    expect(main).toContain('prefix = "rwos-stg-ca-tor"');
    expect(main).toContain('assertion.ref == \'refs/heads/main\'');
    expect(main).not.toMatch(/billing_account|google_project\b|prod-|production/u);
    expect(main).not.toContain("GOOGLE_APPLICATION_CREDENTIALS");
    expect(main).toContain("roles/iam.workloadIdentityUser");
    expect(main).not.toMatch(/secret_data|secret_value|password\s*=/u);
  });

  it("uses all eight immutable service images and fail-closed health probes", async () => {
    const main = await read("main.tf");
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
      expect(main).toContain(`${service}`);
    }
    expect(main).toContain('image = var.image_digests[each.key]');
    expect(main).toContain('path = "/health"');
    expect(main).toContain("deletion_protection = true");
  });
});
