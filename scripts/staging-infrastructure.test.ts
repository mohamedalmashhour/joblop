import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const root = "infrastructure/staging";
const read = (plan: "state-bootstrap" | "bootstrap" | "runtime", name: string) =>
  readFile(`${root}/${plan}/${name}`, "utf8");

describe("split staging infrastructure packages", () => {
  it("keeps Terraform state, plans, backend inputs, and crash logs out of Git", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    for (const pattern of [
      ".terraform/",
      "*.tfstate",
      "*.tfstate.*",
      "*.tfplan",
      "*.tfbackend",
      ".terraform.tfstate.lock.info",
      "crash.log",
      "crash.*.log"
    ]) {
      expect(ignore).toContain(pattern);
    }
  });

  it.each(["state-bootstrap", "bootstrap", "runtime"] as const)(
    "keeps %s independently reviewable",
    async (plan) => {
      const files = (await readdir(`${root}/${plan}`, { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => name !== ".terraform.lock.hcl")
        .sort();
      const expected = [
        "backend.gcs.tfbackend.example",
        "main.tf",
        "outputs.tf",
        "terraform.tfvars.example",
        "variables.tf",
        "versions.tf"
      ];
      if (plan === "state-bootstrap") {
        expected.push("backend.gcs.tf.example", "backend.tf");
      }
      expect(files).toEqual(expected.sort());
    }
  );

  it("keeps Plan 0 limited to protected remote state", async () => {
    const main = await read("state-bootstrap", "main.tf");
    const activeBackend = await read("state-bootstrap", "backend.tf");
    const remoteBackend = await read("state-bootstrap", "backend.gcs.tf.example");
    expect(activeBackend).toContain('backend "gcs"');
    expect(activeBackend).not.toContain('backend "local"');
    expect(remoteBackend).toContain('backend "gcs"');
    expect(main).toContain('public_access_prevention    = "enforced"');
    expect(main).toContain("uniform_bucket_level_access = true");
    expect(main).toContain("versioning {");
    expect(main).toContain("soft_delete_policy");
    expect(main).toContain("days_since_noncurrent_time = 90");
    expect(main).toContain('role   = "roles/storage.objectAdmin"');
    expect(main).not.toMatch(/google_cloud_run|google_sql|google_redis|google_secret_manager/u);
  });

  it("limits Plan A to bootstrap, identity and cost controls", async () => {
    const main = await read("bootstrap", "main.tf");
    for (const resource of [
      "google_artifact_registry_repository",
      "google_iam_workload_identity_pool",
      "google_iam_workload_identity_pool_provider",
      "google_service_account",
      "google_billing_budget",
      "google_monitoring_notification_channel"
    ]) {
      expect(main).toContain(`resource "${resource}"`);
    }
    expect(main).toContain("roles/artifactregistry.writer");
    expect(main).toContain("roles/run.developer");
    for (const threshold of ["0.33", "0.67", "0.9", "1.0"]) {
      expect(main).toContain(`threshold_percent = ${threshold}`);
    }
    expect(main).toContain('currency_code = "CAD"');
    expect(main).toContain("assertion.environment == '${var.github_environment}'");
    expect(main).toContain("assertion.sha == '${var.approved_release_sha}'");
    expect(main).toContain("assertion.repository_visibility == 'private'");
    expect(main).toContain("rwos_staging_deployment_state_only");
    expect(main).toContain("objects/terraform/plan-a-bootstrap/");
    expect(main).toContain("objects/terraform/plan-b-runtime/");
    expect(main).toContain("disable_default_iam_recipients  = false");
    expect(main).toContain("enable_project_level_recipients = true");
    expect(main).toContain('role   = "roles/storage.objectAdmin"');
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
