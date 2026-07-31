import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const root = "infrastructure/staging";
const read = (plan: "bootstrap" | "runtime", name: string) =>
  readFile(`${root}/${plan}/${name}`, "utf8");

describe("split staging infrastructure packages", () => {
  it.each(["bootstrap", "runtime"] as const)("keeps %s independently reviewable", async (plan) => {
    const files = (await readdir(`${root}/${plan}`, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name !== ".terraform.lock.hcl")
      .sort();
    expect(files).toEqual([
      "main.tf",
      "outputs.tf",
      "terraform.tfvars.example",
      "variables.tf",
      "versions.tf"
    ]);
  });

  it("limits Plan A to bootstrap, identity and cost controls", async () => {
    const main = await read("bootstrap", "main.tf");
    for (const resource of [
      "google_artifact_registry_repository",
      "google_iam_workload_identity_pool",
      "google_iam_workload_identity_pool_provider",
      "google_service_account",
      "google_billing_budget"
    ]) {
      expect(main).toContain(`resource "${resource}"`);
    }
    expect(main).toContain("roles/artifactregistry.writer");
    expect(main).toContain("roles/run.developer");
    expect(main).toContain("threshold_percent = 0.5");
    expect(main).not.toMatch(/google_cloud_run|google_sql|google_redis|google_secret_manager/u);
  });

  it("keeps Plan B bounded, private and dependent on reviewed Plan A outputs", async () => {
    const main = await read("runtime", "main.tf");
    const variables = await read("runtime", "variables.tf");
    expect(main).toContain("min_instance_count = 0");
    expect(main).toContain("max_instance_count = 1");
    expect(main).toContain("disk_autoresize_limit");
    expect(main).toContain("roles/secretmanager.secretAccessor");
    expect(main).toContain("roles/iam.serviceAccountUser");
    expect(main).toContain("roles/run.invoker");
    expect(main).toContain("depends_on = [");
    expect(main).toContain("google_logging_project_bucket_config");
    expect(main).toContain("google_monitoring_alert_policy");
    expect(main).not.toContain("google_compute_network.default");
    expect(variables).toContain('var.network_cidr == "10.80.0.0/24"');
    expect(variables).toContain("images_published_approval_reference");
    expect(variables).toContain("monitoring_notification_channels");
  });

  it("keeps Stripe, email and registration fail closed in the runtime example", async () => {
    const example = await read("runtime", "terraform.tfvars.example");
    expect(example).toContain('STRIPE_TEST_MODE_ENABLED        = "disabled"');
    expect(example).toContain('EMPLOYER_SELF_REGISTRATION_ENABLED = "disabled"');
    expect(example).not.toMatch(/sk_test_|whsec_|password|api[_-]?key\s*=/iu);
  });
});
