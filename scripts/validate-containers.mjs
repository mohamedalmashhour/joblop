import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const docker = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});
if (docker.error?.code === "ENOENT") {
  process.stderr.write("CONTAINER_RUNTIME_UNAVAILABLE runtime=docker\n");
  process.exit(2);
}
if (docker.status !== 0) {
  process.stderr.write("CONTAINER_RUNTIME_UNAVAILABLE runtime=docker-daemon\n");
  process.exit(2);
}

const matrix = JSON.parse(readFileSync("container-build-matrix.json", "utf8"));
const requestedService = process.env.RWOS_CONTAINER_SERVICE;
const services = requestedService
  ? matrix.services.filter((service) => service.name === requestedService)
  : matrix.services;
if (requestedService && services.length !== 1) {
  fail(`RWOS_CONTAINER_SERVICE_UNKNOWN service=${requestedService}`);
}
const releaseSha = process.env.RWOS_CONTAINER_GIT_SHA;
const buildTimestamp = process.env.RWOS_CONTAINER_BUILD_TIMESTAMP;
const sourceRepository = process.env.RWOS_CONTAINER_SOURCE_REPOSITORY;
const imageVersion = process.env.RWOS_CONTAINER_IMAGE_VERSION;
const approvedAdapterRuntimeReleaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";
if (!/^[a-f0-9]{40}$/.test(releaseSha ?? "")) fail("RWOS_CONTAINER_GIT_SHA_REQUIRED");
if (!buildTimestamp || !Number.isFinite(Date.parse(buildTimestamp))) {
  fail("RWOS_CONTAINER_BUILD_TIMESTAMP_REQUIRED");
}
if (!sourceRepository) fail("RWOS_CONTAINER_SOURCE_REPOSITORY_REQUIRED");
if (!imageVersion) fail("RWOS_CONTAINER_IMAGE_VERSION_REQUIRED");

for (const [index, service] of services.entries()) {
  const image = `rwos-local/${service.name}:${releaseSha}`;
  const container = `rwos-local-${service.name}-${process.pid}`;
  const hostPort = 18_180 + index;
  run("docker", [
    "build",
    "--file",
    service.dockerfile,
    "--tag",
    image,
    "--build-arg",
    `RWOS_GIT_SHA=${releaseSha}`,
    "--build-arg",
    `RWOS_BUILD_TIMESTAMP=${buildTimestamp}`,
    "--build-arg",
    `RWOS_SOURCE_REPOSITORY=${sourceRepository}`,
    "--build-arg",
    `RWOS_IMAGE_VERSION=${imageVersion}`,
    "."
  ]);
  const imageDigest = capture("docker", ["image", "inspect", "--format", "{{.Id}}", image]);
  if (!/^sha256:[a-f0-9]{64}$/.test(imageDigest)) {
    fail(`CONTAINER_IMAGE_DIGEST_INVALID service=${service.name}`);
  }
  try {
    const environment =
      service.name === "api"
        ? ["--env", "RWOS_ENV=staging", "--env", "NODE_ENV=production"]
        : service.name === "auth-limiter"
          ? [
              "--env",
              "RWOS_ENV=staging",
              "--env",
              `AUTH_LIMITER_RELEASE_SHA=${approvedAdapterRuntimeReleaseSha}`,
              "--env",
              "AUTH_LIMITER_AUTH_MODE=dual-required",
              "--env",
              "AUTH_LIMITER_AUDIENCE=https://auth-limiter-local-validation.run.app",
              "--env",
              "AUTH_LIMITER_API_SERVICE_ACCOUNT=api@local-validation.invalid",
              "--env",
              "AUTH_LIMITER_REDIS_URL=redis://127.0.0.1:1",
              "--env",
              "AUTH_LIMITER_SERVICE_TOKEN=local-validation-token-at-least-32-characters",
              "--env",
              "AUTH_LIMITER_NAMESPACE=rwos:authrl:staging:v1",
              "--env",
              "AUTH_LIMITER_CURRENT_KEY_ID=local-validation"
            ]
          : service.name === "candidate-source"
            ? [
                "--env",
                "RWOS_ENV=staging",
                "--env",
                `CANDIDATE_ADAPTER_RELEASE_SHA=${approvedAdapterRuntimeReleaseSha}`,
                "--env",
                "CANDIDATE_ADAPTER_AUTH_MODE=dual-required",
                "--env",
                "CANDIDATE_ADAPTER_AUDIENCE=https://candidate-source-local-validation.run.app",
                "--env",
                "CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT=api@local-validation.invalid",
                "--env",
                "CANDIDATE_ADAPTER_SERVICE_TOKEN=local-validation-token-at-least-32-characters",
                "--env",
                "CANDIDATE_ADAPTER_TENANT_A_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "--env",
                "CANDIDATE_ADAPTER_TENANT_A_WORK_GROUP_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001",
                "--env",
                "CANDIDATE_ADAPTER_TENANT_A_ROLE_DEFINITION_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002",
                "--env",
                "CANDIDATE_ADAPTER_TENANT_B_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "--env",
                "CANDIDATE_ADAPTER_TENANT_B_WORK_GROUP_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001",
                "--env",
                "CANDIDATE_ADAPTER_TENANT_B_ROLE_DEFINITION_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002"
              ]
            : service.name === "offer-delivery"
              ? [
                  "--env",
                  "RWOS_ENV=staging",
                  "--env",
                  `OFFER_DELIVERY_ADAPTER_RELEASE_SHA=${approvedAdapterRuntimeReleaseSha}`,
                  "--env",
                  "OFFER_DELIVERY_ADAPTER_AUTH_MODE=dual-required",
                  "--env",
                  "OFFER_DELIVERY_ADAPTER_AUDIENCE=https://offer-delivery-local-validation.run.app",
                  "--env",
                  "OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT=api@local-validation.invalid",
                  "--env",
                  "OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN=local-validation-token-at-least-32-characters",
                  "--env",
                  "OFFER_DELIVERY_ADAPTER_TENANT_A_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  "--env",
                  "OFFER_DELIVERY_ADAPTER_TENANT_B_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
                ]
              : service.name === "qa-reset"
                ? [
                    "--env",
                    "RWOS_ENV=staging",
                    "--env",
                    "QA_RESET_PERSISTENCE_MODE=postgres",
                    "--env",
                    "QA_RESET_AUTH_MODE=dual-required",
                    "--env",
                    "QA_RESET_AUDIENCE=https://qa-reset-local-validation.run.app",
                    "--env",
                    "QA_RESET_API_SERVICE_ACCOUNT=api@local-validation.invalid",
                    "--env",
                    "QA_RESET_BROWSER_E2E_APP_CREDENTIAL=local-browser-validation-credential-at-least-32-characters",
                    "--env",
                    "QA_RESET_BROWSER_E2E_SERVICE_ACCOUNT=browser-e2e@local-validation.invalid",
                    "--env",
                    "QA_RESET_BROWSER_E2E_OPERATOR_IDENTITY=gcp/operator/qa-reset-browser-validator-001",
                    "--env",
                    "QA_RESET_IOS_E2E_APP_CREDENTIAL=local-ios-validation-credential-at-least-32-characters",
                    "--env",
                    "QA_RESET_IOS_E2E_SERVICE_ACCOUNT=ios-e2e@local-validation.invalid",
                    "--env",
                    "QA_RESET_IOS_E2E_OPERATOR_IDENTITY=gcp/operator/qa-reset-ios-validator-001",
                    "--env",
                    "QA_RESET_ANDROID_E2E_APP_CREDENTIAL=local-android-validation-credential-at-least-32-characters",
                    "--env",
                    "QA_RESET_ANDROID_E2E_SERVICE_ACCOUNT=android-e2e@local-validation.invalid",
                    "--env",
                    "QA_RESET_ANDROID_E2E_OPERATOR_IDENTITY=gcp/operator/qa-reset-android-validator-001",
                    "--env",
                    "QA_RESET_MANUAL_QA_APP_CREDENTIAL=local-manual-qa-validation-credential-at-least-32-characters",
                    "--env",
                    "QA_RESET_MANUAL_QA_SERVICE_ACCOUNT=manual-qa@local-validation.invalid",
                    "--env",
                    "QA_RESET_MANUAL_QA_OPERATOR_IDENTITY=gcp/operator/qa-reset-manual-validator-001",
                    "--env",
                    "QA_RESET_MONITORING_APP_CREDENTIAL=local-monitoring-validation-credential-at-least-32-characters",
                    "--env",
                    "QA_RESET_MONITORING_SERVICE_ACCOUNT=monitoring@local-validation.invalid",
                    "--env",
                    `QA_RESET_RELEASE_SHA=${approvedAdapterRuntimeReleaseSha}`,
                    "--env",
                    "QA_RESET_PROJECT_ID=gcp/project/rwos-staging-001",
                    "--env",
                    "QA_RESET_CLUSTER_ID=gcp/cluster/rwos-staging-001",
                    "--env",
                    "QA_RESET_DATABASE_ID=gcp/database/rwos-staging-001",
                    "--env",
                    "QA_RESET_AUTHORITY_ID=gcp/authority/rwos-staging-001",
                    "--env",
                    "QA_RESET_TENANT_A_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    "--env",
                    "QA_RESET_TENANT_B_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    "--env",
                    "QA_RESET_WORK_GROUP_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001",
                    "--env",
                    "QA_RESET_ROLE_DEFINITION_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002",
                    "--env",
                    "QA_RESET_ORGANIZATION_OWNER_ACCESS_ROLE_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003",
                    "--env",
                    "QA_RESET_NAMESPACE=rwos:qa-reset:staging:v1",
                    "--env",
                    "QA_RESET_MANIFEST_ID=rwos-qa-reset-manifest-v1",
                    "--env",
                    `QA_RESET_MANIFEST_CHECKSUM=${"0".repeat(64)}`,
                    "--env",
                    `QA_RESET_MANIFEST_CREATED_AT=${new Date(Date.now() - 86_400_000).toISOString()}`,
                    "--env",
                    `QA_RESET_MANIFEST_EXPIRES_AT=${new Date(Date.now() + 7 * 86_400_000).toISOString()}`,
                    "--env",
                    "QA_RESET_DRY_RUN_APPROVAL_REFERENCE=gcp/approval/dry-run-001",
                    "--env",
                    "QA_RESET_PREPARE_APPROVAL_REFERENCE=gcp/approval/prepare-001",
                    "--env",
                    "QA_RESET_CLEANUP_APPROVAL_REFERENCE=gcp/approval/cleanup-001"
                  ]
                : service.name === "employer" || service.name === "admin"
                  ? [
                      "--env",
                      "RWOS_ENV=production",
                      "--env",
                      "INTERNAL_API_ORIGIN=https://api.invalid"
                    ]
                  : [];
    run("docker", [
      "run",
      "--detach",
      "--name",
      container,
      "--publish",
      `127.0.0.1:${hostPort}:8080`,
      ...environment,
      image
    ]);
    waitFor(`http://127.0.0.1:${hostPort}${service.liveness}`, [200]);
    const failClosedReadinessServices = new Set([
      "api",
      "auth-limiter",
      "candidate-source",
      "offer-delivery",
      "qa-reset"
    ]);
    const readinessStatuses = failClosedReadinessServices.has(service.name) ? [503] : [200];
    waitFor(`http://127.0.0.1:${hostPort}${service.readiness}`, readinessStatuses);
    run("docker", ["stop", "--time", "15", container]);
    process.stdout.write(
      `CONTAINER_VALIDATION_PASS service=${service.name} image=${image} digest=${imageDigest}\n`
    );
  } finally {
    spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  }
}

function waitFor(url, acceptedStatuses) {
  // Keep probing synchronous so Node cannot abandon an unresolved top-level
  // promise while a cold container initializes Corepack and pnpm.
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const probe = spawnSync(
      "curl",
      ["--silent", "--output", "/dev/null", "--write-out", "%{http_code}", "--max-time", "1", url],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const status = Number.parseInt(probe.stdout.trim(), 10);
    if (probe.status === 0 && acceptedStatuses.includes(status)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  throw new Error(`CONTAINER_PROBE_FAILED url=${url}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) fail(`CONTAINER_COMMAND_FAILED command=${command} ${args[0] ?? ""}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.error?.message || "unknown error").trim();
    fail(`COMMAND_FAILED command=${command} detail=${detail}`);
  }
  return result.stdout.trim();
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
