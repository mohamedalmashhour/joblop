import { describe, expect, it } from "vitest";
import {
  createFirstAdminBootstrapService,
  type FirstAdminBootstrapRepository
} from "./firstAdminBootstrap";

const releaseSha = "a".repeat(40);
const configuredSecret = "synthetic-bootstrap-secret-value-000001";
const future = new Date("2026-08-01T00:15:00.000Z");
const now = new Date("2026-08-01T00:00:00.000Z");

function repository(): FirstAdminBootstrapRepository & { outcomes: string[]; created: number } {
  return {
    outcomes: [],
    created: 0,
    async attemptAtomic() {
      this.created += 1;
      if (this.created > 1) return { outcome: "already_completed" };
      return { outcome: "created", userId: "11111111-1111-4111-8111-111111111111" };
    },
    async recordOutcome(input) {
      this.outcomes.push(input.outcome);
    }
  };
}

function service(
  repo: FirstAdminBootstrapRepository,
  overrides: Partial<Parameters<typeof createFirstAdminBootstrapService>[1]> = {}
) {
  return createFirstAdminBootstrapService(
    repo,
    {
      enabled: true,
      environment: "staging",
      releaseSha,
      configuredSecret,
      expiresAt: future,
      ...overrides
    },
    { now: () => now }
  );
}

const request = {
  presentedSecret: configuredSecret,
  email: "synthetic.admin@example.invalid",
  displayName: "Synthetic Staging Administrator",
  password: "SyntheticPassword123",
  correlationId: "bootstrap-test"
};

describe("first platform administrator bootstrap", () => {
  it("is disabled by default or outside staging", async () => {
    const repo = repository();
    await expect(service(repo, { enabled: false }).bootstrap(request)).resolves.toEqual({
      outcome: "disabled"
    });
    await expect(service(repo, { environment: "production" }).bootstrap(request)).resolves.toEqual({
      outcome: "disabled"
    });
    expect(repo.created).toBe(0);
  });

  it.each([
    ["missing", undefined],
    ["invalid", "not-the-configured-secret"]
  ])("rejects a %s secret without recording it", async (_label, presentedSecret) => {
    const repo = repository();
    await expect(service(repo).bootstrap({ ...request, presentedSecret })).resolves.toEqual({
      outcome: "invalid"
    });
    expect(repo.outcomes).toEqual(["invalid"]);
    expect(repo.created).toBe(0);
  });

  it("rejects an expired secret", async () => {
    const repo = repository();
    await expect(service(repo, { expiresAt: now }).bootstrap(request)).resolves.toEqual({
      outcome: "expired"
    });
    expect(repo.created).toBe(0);
  });

  it("allows one creation and rejects replay", async () => {
    const repo = repository();
    await expect(service(repo).bootstrap(request)).resolves.toMatchObject({ outcome: "created" });
    await expect(service(repo).bootstrap(request)).resolves.toEqual({
      outcome: "already_completed"
    });
  });

  it("serializes concurrent attempts through the atomic repository boundary", async () => {
    const repo = repository();
    const results = await Promise.all([
      service(repo).bootstrap(request),
      service(repo).bootstrap({ ...request, correlationId: "bootstrap-test-2" })
    ]);
    expect(results.map(({ outcome }) => outcome).sort()).toEqual(["already_completed", "created"]);
  });
});
