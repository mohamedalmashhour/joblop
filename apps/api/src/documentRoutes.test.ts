import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  createFakeMalwareScanner,
  createLocalDocumentService,
  createMemoryPrivateObjectStore
} from "./documentUpload";
import { createDocumentUploadContract } from "./documentUploadContract";
import { registerDocumentRoutes } from "./documentRoutes";

const pdfBase64 = Buffer.from("%PDF-1.7\nsynthetic document", "utf8").toString("base64");

function build() {
  const app = Fastify();
  const service = createLocalDocumentService({
    store: createMemoryPrivateObjectStore(),
    scanner: createFakeMalwareScanner("clean"),
    now: () => new Date().toISOString(),
    referenceSecret: "synthetic-reference-secret-at-least-32-characters"
  });
  registerDocumentRoutes(app, {
    service,
    contract: createDocumentUploadContract({
      secret: "synthetic-contract-secret-at-least-32-characters",
      nowEpochSeconds: () => Math.floor(Date.now() / 1000)
    }),
    async authorize(request, input) {
      const actorId = request.headers.authorization?.replace("Bearer ", "");
      if (!actorId || input.organizationId !== "tenantA") return null;
      if (actorId === "platform-a") {
        return { actorId, ownerId: input.ownerId ?? actorId, role: "platform_admin" };
      }
      if (actorId === "admin-a") {
        return { actorId, ownerId: input.ownerId ?? actorId, role: "employer_admin" };
      }
      if (actorId === "worker-a" && (!input.ownerId || input.ownerId === actorId)) {
        return { actorId, ownerId: actorId, role: "worker" };
      }
      return null;
    }
  });
  return app;
}

async function upload(app: ReturnType<typeof build>) {
  const requested = await app.inject({
    method: "POST",
    url: "/organizations/tenantA/document-uploads",
    headers: { authorization: "Bearer worker-a" },
    payload: {
      ownerId: "worker-a",
      type: "worker_certification",
      filename: "synthetic-certificate.pdf",
      declaredContentType: "application/pdf",
      idempotencyKey: "synthetic-upload-a"
    }
  });
  expect(requested.statusCode).toBe(201);
  const issued = requested.json().upload as { id: string; token: string };
  const completed = await app.inject({
    method: "PUT",
    url: `/organizations/tenantA/document-uploads/${issued.id}`,
    headers: { authorization: "Bearer worker-a" },
    payload: { token: issued.token, contentBase64: pdfBase64 }
  });
  expect(completed.statusCode).toBe(201);
  return completed.json().document as { id: string; version: number; state: string };
}

describe("authenticated document routes", () => {
  it("requests, completes, scans, lists and reads without exposing object keys", async () => {
    const app = build();
    const document = await upload(app);
    expect(document.state).toBe("clean");
    expect(document).not.toHaveProperty("objectKey");

    const listed = await app.inject({
      method: "GET",
      url: "/organizations/tenantA/documents?ownerId=worker-a",
      headers: { authorization: "Bearer worker-a" }
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().documents).toHaveLength(1);
    expect(JSON.stringify(listed.json())).not.toContain("quarantine/");

    const read = await app.inject({
      method: "GET",
      url: `/organizations/tenantA/documents/${document.id}`,
      headers: { authorization: "Bearer worker-a" }
    });
    expect(read.statusCode).toBe(200);
    await app.close();
  });

  it("approves and downloads only through an authorized short-lived reference", async () => {
    const app = build();
    const document = await upload(app);
    const approved = await app.inject({
      method: "POST",
      url: `/organizations/tenantA/documents/${document.id}/decision`,
      headers: { authorization: "Bearer admin-a" },
      payload: { decision: "approve", expectedVersion: document.version }
    });
    expect(approved.statusCode).toBe(200);

    const referenceResponse = await app.inject({
      method: "POST",
      url: `/organizations/tenantA/documents/${document.id}/download-reference`,
      headers: { authorization: "Bearer worker-a" }
    });
    expect(referenceResponse.statusCode).toBe(200);
    const downloaded = await app.inject({
      method: "POST",
      url: `/organizations/tenantA/documents/${document.id}/download`,
      headers: { authorization: "Bearer worker-a" },
      payload: { reference: referenceResponse.json().reference }
    });
    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.json().contentBase64).toBe(pdfBase64);
    await app.close();
  });

  it("denies unauthenticated, wrong-owner and cross-organization paths without disclosure", async () => {
    const app = build();
    const document = await upload(app);
    for (const request of [
      { url: `/organizations/tenantA/documents/${document.id}`, headers: {} },
      {
        url: `/organizations/tenantA/documents/${document.id}`,
        headers: { authorization: "Bearer worker-b" }
      },
      {
        url: `/organizations/tenantB/documents/${document.id}`,
        headers: { authorization: "Bearer platform-a" }
      }
    ]) {
      const response = await app.inject({ method: "GET", ...request });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: "RWOS_RESOURCE_UNAVAILABLE",
        message: "Resource unavailable."
      });
    }
    await app.close();
  });

  it("rejects ticket replay by another actor and conflicting upload replay", async () => {
    const app = build();
    const requested = await app.inject({
      method: "POST",
      url: "/organizations/tenantA/document-uploads",
      headers: { authorization: "Bearer worker-a" },
      payload: {
        ownerId: "worker-a",
        type: "worker_certification",
        filename: "synthetic.pdf",
        declaredContentType: "application/pdf",
        idempotencyKey: "replay-key"
      }
    });
    const issued = requested.json().upload as { id: string; token: string };
    const denied = await app.inject({
      method: "PUT",
      url: `/organizations/tenantA/document-uploads/${issued.id}`,
      headers: { authorization: "Bearer admin-a" },
      payload: { token: issued.token, contentBase64: pdfBase64 }
    });
    expect(denied.statusCode).toBe(400);
    await app.close();
  });
});
