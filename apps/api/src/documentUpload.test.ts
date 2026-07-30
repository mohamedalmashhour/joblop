import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createFakeMalwareScanner,
  createLocalDocumentService,
  createLocalPrivateFileObjectStore,
  createMemoryPrivateObjectStore
} from "./documentUpload";

const pdf = new TextEncoder().encode("%PDF-1.7\nsynthetic");

function service(scan: "clean" | "infected" | "error" = "clean") {
  return createLocalDocumentService({
    store: createMemoryPrivateObjectStore(),
    scanner: createFakeMalwareScanner(scan),
    now: () => "2026-07-30T12:00:00.000Z",
    referenceSecret: "synthetic-reference-secret"
  });
}

async function upload(target = service()) {
  const document = await target.upload({
    organizationId: "tenantA",
    ownerId: "worker-a",
    actorId: "worker-a",
    role: "worker",
    type: "worker_certification",
    filename: "synthetic-certificate.pdf",
    declaredContentType: "application/pdf",
    bytes: pdf,
    idempotencyKey: "upload-1"
  });
  return { target, document };
}

describe("local document upload boundary", () => {
  it("quarantines, scans, approves and downloads an integrity-checked document", async () => {
    const { target, document } = await upload();
    expect(document.objectKey).not.toContain(document.originalFilename);
    expect(document.state).toBe("quarantined");
    const clean = await target.scan({
      documentId: document.id,
      organizationId: "tenantA",
      actorId: "system",
      expectedVersion: 1
    });
    const approved = await target.decide({
      documentId: document.id,
      organizationId: "tenantA",
      actorId: "admin-a",
      role: "employer_admin",
      decision: "approve",
      expectedVersion: clean.version
    });
    const result = await target.download({
      documentId: document.id,
      organizationId: "tenantA",
      actorId: "worker-a",
      role: "worker",
      ownerId: "worker-a"
    });
    expect(approved.state).toBe("approved");
    expect(result.bytes).toEqual(pdf);
    expect((await target.listAudit(document.id, "tenantA")).map((entry) => entry.action)).toEqual([
      "upload",
      "scan_clean",
      "approve",
      "download"
    ]);
  });

  it.each(["infected", "error"] as const)("fails closed for %s scan results", async (scan) => {
    const { target, document } = await upload(service(scan));
    const scanned = await target.scan({
      documentId: document.id,
      organizationId: "tenantA",
      actorId: "system",
      expectedVersion: 1
    });
    expect(scanned.state).toBe(scan === "error" ? "scan_error" : "infected");
    await expect(
      target.download({
        documentId: document.id,
        organizationId: "tenantA",
        actorId: "worker-a",
        role: "worker",
        ownerId: "worker-a"
      })
    ).rejects.toThrow("not available");
  });

  it("enforces magic bytes, declared type, size and safe filenames", async () => {
    const target = service();
    const base = {
      organizationId: "tenantA",
      ownerId: "worker-a",
      actorId: "worker-a",
      role: "worker" as const,
      type: "worker_certification" as const,
      declaredContentType: "application/pdf",
      bytes: pdf
    };
    await expect(target.upload({ ...base, filename: "../secret.pdf", idempotencyKey: "a" })).rejects.toThrow("unsafe");
    await expect(target.upload({ ...base, filename: "fake.pdf", bytes: new TextEncoder().encode("not pdf"), idempotencyKey: "b" })).rejects.toThrow("does not match");
    await expect(target.upload({ ...base, filename: "fake.png", idempotencyKey: "c" })).rejects.toThrow("does not match");
    await expect(target.upload({ ...base, filename: "empty.pdf", bytes: new Uint8Array(), idempotencyKey: "d" })).rejects.toThrow("size");
  });

  it("denies every cross-organization read, scan, decision, download and audit path", async () => {
    const { target, document } = await upload();
    await expect(target.get(document.id, "tenantB")).rejects.toThrow("outside");
    await expect(target.listAudit(document.id, "tenantB")).rejects.toThrow("outside");
    await expect(target.scan({ documentId: document.id, organizationId: "tenantB", actorId: "system", expectedVersion: 1 })).rejects.toThrow("outside");
    await expect(target.decide({ documentId: document.id, organizationId: "tenantB", actorId: "admin-b", role: "platform_admin", decision: "reject", expectedVersion: 1 })).rejects.toThrow("outside");
    await expect(target.download({ documentId: document.id, organizationId: "tenantB", actorId: "admin-b", role: "platform_admin", ownerId: "worker-a" })).rejects.toThrow("outside");
  });

  it("supports exact replay, rejects conflicting replay and detects concurrent mutation", async () => {
    const { target, document } = await upload();
    const replay = await target.upload({
      organizationId: "tenantA",
      ownerId: "worker-a",
      actorId: "worker-a",
      role: "worker",
      type: "worker_certification",
      filename: "synthetic-certificate.pdf",
      declaredContentType: "application/pdf",
      bytes: pdf,
      idempotencyKey: "upload-1"
    });
    expect(replay.id).toBe(document.id);
    await expect(target.upload({
      organizationId: "tenantA",
      ownerId: "worker-a",
      actorId: "worker-a",
      role: "worker",
      type: "worker_certification",
      filename: "different.pdf",
      declaredContentType: "application/pdf",
      bytes: pdf,
      idempotencyKey: "upload-1"
    })).rejects.toThrow("idempotency conflict");
    await target.scan({ documentId: document.id, organizationId: "tenantA", actorId: "system", expectedVersion: 1 });
    await expect(target.scan({ documentId: document.id, organizationId: "tenantA", actorId: "system", expectedVersion: 1 })).rejects.toThrow("not awaiting");
  });

  it("issues only short-lived opaque references for approved documents", async () => {
    const { target, document } = await upload();
    const clean = await target.scan({ documentId: document.id, organizationId: "tenantA", actorId: "system", expectedVersion: 1 });
    await target.decide({ documentId: document.id, organizationId: "tenantA", actorId: "admin-a", role: "platform_admin", decision: "approve", expectedVersion: clean.version });
    const reference = await target.createDownloadReference({
      documentId: document.id,
      organizationId: "tenantA",
      expiresAtEpochSeconds: 1785412920
    });
    expect(reference).not.toContain("synthetic-certificate");
    expect(reference.split(".")).toHaveLength(4);
    await expect(target.verifyDownloadReference(reference)).resolves.toEqual({
      documentId: document.id,
      organizationId: "tenantA"
    });
    await expect(target.verifyDownloadReference(`${reference}tampered`)).rejects.toThrow("invalid");
  });

  it("replaces, expires and deletes only through authorized state transitions", async () => {
    const target = service();
    const first = await upload(target);
    const firstClean = await target.scan({ documentId: first.document.id, organizationId: "tenantA", actorId: "system", expectedVersion: 1 });
    const firstApproved = await target.decide({ documentId: first.document.id, organizationId: "tenantA", actorId: "admin-a", role: "employer_admin", decision: "approve", expectedVersion: firstClean.version });
    const replacement = await target.upload({
      organizationId: "tenantA",
      ownerId: "worker-a",
      actorId: "worker-a",
      role: "worker",
      type: "worker_certification",
      filename: "replacement.pdf",
      declaredContentType: "application/pdf",
      bytes: pdf,
      idempotencyKey: "replacement-1",
      replacementForId: first.document.id
    });
    const replacementClean = await target.scan({ documentId: replacement.id, organizationId: "tenantA", actorId: "system", expectedVersion: 1 });
    const replacementApproved = await target.decide({ documentId: replacement.id, organizationId: "tenantA", actorId: "admin-a", role: "employer_admin", decision: "approve", expectedVersion: replacementClean.version });
    const replaced = await target.markReplaced({
      documentId: first.document.id,
      replacementDocumentId: replacement.id,
      organizationId: "tenantA",
      actorId: "admin-a",
      role: "employer_admin",
      expectedVersion: firstApproved.version
    });
    expect(replaced.state).toBe("replaced");
    const expired = await target.expire({
      documentId: replacement.id,
      organizationId: "tenantA",
      actorId: "admin-a",
      role: "platform_admin",
      expectedVersion: replacementApproved.version
    });
    expect(expired.state).toBe("expired");
    const removed = await target.remove({
      documentId: replacement.id,
      organizationId: "tenantA",
      actorId: "admin-a",
      role: "platform_admin",
      expectedVersion: expired.version
    });
    expect(removed.state).toBe("deleted");
  });

  it("stores local objects as private regular files and rejects unsafe keys and symlinks", async () => {
    const root = await mkdtemp(join(tmpdir(), "rwos-documents-"));
    try {
      const store = createLocalPrivateFileObjectStore(root);
      const key = "quarantine/tenantA/00000000-0000-4000-8000-000000000001";
      await store.put({ key, bytes: pdf });
      expect(await store.get(key)).toEqual(pdf);
      expect((await stat(join(root, key))).mode & 0o777).toBe(0o600);
      await expect(
        store.put({ key: "quarantine/../../secret", bytes: pdf })
      ).rejects.toThrow("invalid");
      const linkKey = "quarantine/tenantA/00000000-0000-4000-8000-000000000002";
      await symlink(join(root, key), join(root, linkKey));
      await expect(store.get(linkKey)).rejects.toThrow("private regular file");
      await store.delete(key);
      expect(await store.get(key)).toBeNull();
      await expect(readFile(join(root, key))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
