import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Cloud Run application packaging", () => {
  it.each([
    "api",
    "employer",
    "admin",
    "mobile",
    "auth-limiter",
    "candidate-source",
    "offer-delivery",
    "qa-reset"
  ])("defines a reproducible non-root %s container", (application) => {
    const dockerfile = read(`apps/${application}/Dockerfile`);
    expect(dockerfile).toContain("pnpm install --frozen-lockfile");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("EXPOSE 8080");
    expect(dockerfile).toContain('org.opencontainers.image.revision="$RWOS_GIT_SHA"');
    expect(dockerfile).toContain('org.opencontainers.image.created="$RWOS_BUILD_TIMESTAMP"');
    expect(dockerfile).toContain('org.opencontainers.image.source="$RWOS_SOURCE_REPOSITORY"');
    expect(dockerfile).toContain('org.opencontainers.image.version="$RWOS_IMAGE_VERSION"');
  });

  it("excludes local and sensitive material from build contexts", () => {
    const dockerignore = read(".dockerignore");
    expect(dockerignore).toContain(".env");
    expect(dockerignore).toContain(".git");
    expect(dockerignore).toContain("test-results");
    expect(dockerignore).toContain("external-validation-evidence");
  });

  it.each(["employer", "admin"])(
    "copies the shared ESLint configuration into the %s build context",
    (application) => {
      expect(read(`apps/${application}/Dockerfile`)).toContain(
        "tsconfig*.json eslint.config.mjs ./"
      );
    }
  );

  it.each(["api", "qa-reset"])(
    "installs the Prisma OpenSSL runtime dependency in both %s stages",
    (application) => {
      const dockerfile = read(`apps/${application}/Dockerfile`);
      expect(
        dockerfile.match(/apt-get install --yes --no-install-recommends openssl/g)
      ).toHaveLength(2);
      expect(dockerfile.match(/rm -rf \/var\/lib\/apt\/lists\/\*/g)).toHaveLength(2);
    }
  );

  it.each([
    "api",
    "employer",
    "admin",
    "auth-limiter",
    "candidate-source",
    "offer-delivery",
    "qa-reset"
  ])("shares the pinned Corepack cache with the non-root %s runtime", (application) => {
    const dockerfile = read(`apps/${application}/Dockerfile`);
    expect(dockerfile).toContain("COREPACK_HOME=/opt/corepack");
    expect(dockerfile).toContain('chmod -R a+rX "$COREPACK_HOME"');
  });

  it("defines the local build targets", () => {
    const matrix = JSON.parse(read("container-build-matrix.json")) as {
      services: Array<{ name: string; dockerfile: string }>;
    };
    expect(matrix.services.map(({ name }) => name)).toEqual([
      "api",
      "employer",
      "admin",
      "worker",
      "auth-limiter",
      "candidate-source",
      "offer-delivery",
      "qa-reset"
    ]);
    for (const service of matrix.services) {
      expect(service.dockerfile).toMatch(
        /^apps\/(api|employer|admin|mobile|auth-limiter|candidate-source|offer-delivery|qa-reset)\/Dockerfile$/
      );
    }
  });

  it("supports exact per-service CI runtime validation without silently accepting unknown targets", () => {
    const validator = read("scripts/validate-containers.mjs");
    expect(validator).toContain("process.env.RWOS_CONTAINER_SERVICE");
    expect(validator).toContain("services.length !== 1");
    expect(validator).toContain("RWOS_CONTAINER_SERVICE_UNKNOWN");
    expect(validator).toContain("for (const [index, service] of services.entries())");
    expect(validator).toContain('"docker", ["image", "inspect", "--format", "{{.Id}}", image]');
    expect(validator).toContain("CONTAINER_IMAGE_DIGEST_INVALID");
    expect(validator).toContain("digest=${imageDigest}");
  });

  it("keeps adapter runtime probes bound to the frozen approved adapter release", () => {
    const validator = read("scripts/validate-containers.mjs");
    expect(validator).toContain(
      'const approvedAdapterRuntimeReleaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603"'
    );
    for (const variable of [
      "AUTH_LIMITER_RELEASE_SHA",
      "CANDIDATE_ADAPTER_RELEASE_SHA",
      "OFFER_DELIVERY_ADAPTER_RELEASE_SHA",
      "QA_RESET_RELEASE_SHA"
    ]) {
      expect(validator).toContain(`${variable}=\${approvedAdapterRuntimeReleaseSha}`);
    }
    for (const prefix of [
      "AUTH_LIMITER",
      "CANDIDATE_ADAPTER",
      "OFFER_DELIVERY_ADAPTER",
      "QA_RESET"
    ]) {
      expect(validator).toContain(`${prefix}_AUTH_MODE=dual-required`);
      expect(validator).toContain(`${prefix}_AUDIENCE=https://`);
      expect(validator).toContain(`${prefix}_API_SERVICE_ACCOUNT=api@local-validation.invalid`);
    }
  });

  it("requires durable-service readiness to fail closed without external dependencies", () => {
    const validator = read("scripts/validate-containers.mjs");
    for (const service of [
      "api",
      "auth-limiter",
      "candidate-source",
      "offer-delivery",
      "qa-reset"
    ]) {
      expect(validator).toContain(`"${service}"`);
    }
    expect(validator).toContain(
      "const readinessStatuses = failClosedReadinessServices.has(service.name) ? [503] : [200]"
    );
  });

  it("keeps cold-start polling alive long enough to clean up its container", () => {
    const validator = read("scripts/validate-containers.mjs");
    expect(validator).toContain("attempt < 240");
    expect(validator).toContain('"--write-out", "%{http_code}"');
    expect(validator).toContain("Atomics.wait(new Int32Array(new SharedArrayBuffer(4))");
    expect(validator).toContain("throw new Error(`CONTAINER_PROBE_FAILED url=${url}`)");
    expect(validator).toContain('spawnSync("docker", ["rm", "--force", container]');
  });

  it("starts the QA reset image with a synthetic PostgreSQL-only contract", () => {
    const validator = read("scripts/validate-containers.mjs");
    expect(validator).toContain("QA_RESET_PERSISTENCE_MODE=postgres");
    expect(validator).toContain("QA_RESET_TENANT_A_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(validator).toContain("QA_RESET_TENANT_B_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(validator).toContain("QA_RESET_WORK_GROUP_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001");
    expect(validator).toContain("QA_RESET_ROLE_DEFINITION_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002");
    expect(validator).toContain(
      "QA_RESET_ORGANIZATION_OWNER_ACCESS_ROLE_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003"
    );
  });
});
