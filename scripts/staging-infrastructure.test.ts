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
    expect(main).toContain('edition               = "ENTERPRISE"');
    expect(main).toContain("location                       = var.region");
    expect(main).toContain('resource "google_compute_global_address" "sql_private_services"');
    expect(main).toContain("address       = var.sql_private_service_address");
    expect(main).toContain("google_compute_global_address.sql_private_services.name");
    expect(variables).toContain('default = "10.85.251.0"');
    expect(main).toContain("roles/secretmanager.secretAccessor");
    expect(main).toContain("roles/iam.serviceAccountUser");
    expect(main).toContain("roles/run.invoker");
    expect(main).toContain('google_cloud_run_v2_service_iam_member" "public_worker_api');
    expect(main).toContain('google_cloud_run_v2_service_iam_member" "public_staging_api');
    expect(main).toContain('google_cloud_run_v2_service_iam_member" "public_web');
    expect(main).toContain('toset(["employer", "admin", "worker"])');
    expect(main).toContain('google_cloud_run_v2_service_iam_member" "qa_reset_callers');
    expect(main).toContain('ingress = "INGRESS_TRAFFIC_ALL"');
    expect(main).not.toContain("INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER");
    expect(main).toContain('member   = "allUsers"');
    expect(main).toContain('RWOS_PUBLIC_WORKER_INGRESS_ONLY = "enabled"');
    expect(main).toContain("var.deploy_runtime_services ? local.services : {}");
    expect(main).toContain('resource "google_cloud_run_v2_job" "migration"');
    expect(main).toContain("count               = var.deploy_migration_job ? 1 : 0");
    expect(main).toContain('account_id   = "sa-rwos-stg-migration"');
    expect(main).toContain('secret_id = var.migration_database_secret_name');
    expect(main).toContain('args        = ["--filter", "@rwos/database", "prisma:migrate:deploy"]');
    expect(main).toContain("max_retries     = 0");
    expect(main).toContain("task_count  = 1");
    expect(main).toContain("parallelism = 1");
    expect(main).toContain("var.deploy_monitoring_alerts ? 1 : 0");
    expect(main).toContain("worker-api = {");
    expect(main).not.toContain("worker-api = var.service_secret_environment.api");
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
    expect(example).toMatch(/^\s*STRIPE_TEST_MODE_ENABLED\s*=\s*"disabled"/mu);
    expect(example).toMatch(/^\s*EMPLOYER_SELF_REGISTRATION_ENABLED\s*=\s*"disabled"/mu);
    expect(example).not.toMatch(/sk_test_|whsec_|^\s*password\s*=|api[_-]?key\s*=/imu);
  });

  it("keeps the Plan B example aligned with every required runtime contract field", async () => {
    const variables = await read("runtime", "variables.tf");
    const example = await read("runtime", "terraform.tfvars.example");
    const requiredFields = [...variables.matchAll(/"([A-Z][A-Z0-9_]+)"/gu)].map(
      (match) => match[1]
    );

    for (const field of new Set(requiredFields)) {
      expect(example, `missing Plan B example field ${field}`).toMatch(
        new RegExp(`\\b${field}\\s*=`, "u")
      );
    }
  });
});
