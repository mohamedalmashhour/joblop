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
});
