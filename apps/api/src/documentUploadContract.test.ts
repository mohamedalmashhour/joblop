import { describe, expect, it } from "vitest";
import { createDocumentUploadContract } from "./documentUploadContract";

const input = {
  organizationId: "tenantA",
  ownerId: "worker-a",
  actorId: "worker-a",
  role: "worker" as const,
  type: "worker_certification" as const,
  filename: "synthetic.pdf",
  declaredContentType: "application/pdf",
  idempotencyKey: "upload-request-a",
  replacementForId: null
};

describe("document direct-upload contract", () => {
  it("issues a server-generated short-lived ticket bound to actor and organization", () => {
    const contract = createDocumentUploadContract({
      secret: "synthetic-contract-secret-at-least-32-characters",
      nowEpochSeconds: () => 1_785_430_000
    });
    const issued = contract.issue(input);
    expect(issued.uploadId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(
      contract.verify(issued.token, {
        uploadId: issued.uploadId,
        organizationId: "tenantA",
        actorId: "worker-a"
      })
    ).toMatchObject(input);
  });

  it.each([
    { organizationId: "tenantB", actorId: "worker-a" },
    { organizationId: "tenantA", actorId: "worker-b" }
  ])("denies ticket use outside its actor/organization scope", (scope) => {
    const contract = createDocumentUploadContract({
      secret: "synthetic-contract-secret-at-least-32-characters",
      nowEpochSeconds: () => 1_785_430_000
    });
    const issued = contract.issue(input);
    expect(() =>
      contract.verify(issued.token, { uploadId: issued.uploadId, ...scope })
    ).toThrow("invalid or expired");
  });

  it("rejects tampering and expiry", () => {
    let now = 1_785_430_000;
    const contract = createDocumentUploadContract({
      secret: "synthetic-contract-secret-at-least-32-characters",
      nowEpochSeconds: () => now,
      ttlSeconds: 30
    });
    const issued = contract.issue(input);
    expect(() =>
      contract.verify(`${issued.token}0`, {
        uploadId: issued.uploadId,
        organizationId: "tenantA",
        actorId: "worker-a"
      })
    ).toThrow("invalid");
    now += 31;
    expect(() =>
      contract.verify(issued.token, {
        uploadId: issued.uploadId,
        organizationId: "tenantA",
        actorId: "worker-a"
      })
    ).toThrow("expired");
  });
});
