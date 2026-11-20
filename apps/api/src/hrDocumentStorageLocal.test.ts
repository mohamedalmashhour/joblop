import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalPrivateFileObjectStore, createMemoryPrivateObjectStore } from "./documentUpload";
import { createLocalHrDocumentStorageProvider, detectViewableHrDocumentType, sanitizeHrDocumentFileName } from "./hrDocumentStorageLocal";

const SECRET = "0123456789abcdef0123456789abcdef"; // 32 chars
const WORKER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function make() {
  const store = createMemoryPrivateObjectStore();
  const provider = createLocalHrDocumentStorageProvider({ store, secret: SECRET });
  return { store, provider };
}

describe("local HR document storage provider", () => {
  it("rejects a secret that is too short", () => {
    expect(() => createLocalHrDocumentStorageProvider({ store: createMemoryPrivateObjectStore(), secret: "short" })).toThrow();
  });

  it("mints a same-origin upload URL with a signed reference", async () => {
    const { provider } = make();
    const { storageReference, uploadUrl } = await provider.createUploadReference({ workerIdentityId: WORKER, documentType: "certificate" });
    expect(storageReference.startsWith(`${WORKER}/certificate/`)).toBe(true);
    expect(uploadUrl.startsWith("/api/documents/blob?ref=")).toBe(true);
    const sig = new URL(uploadUrl, "https://x").searchParams.get("sig")!;
    expect(provider.verifyUploadSignature(storageReference, sig)).toBe(true);
    expect(provider.verifyUploadSignature(storageReference, "deadbeef")).toBe(false);
  });

  it("sanitizes the document type into the reference", async () => {
    const { provider } = make();
    const { storageReference } = await provider.createUploadReference({ workerIdentityId: WORKER, documentType: "../../etc/passwd" });
    expect(storageReference.startsWith(`${WORKER}/etcpasswd/`)).toBe(true);
  });

  it("verifyReference requires a well-formed, owned reference with stored bytes", async () => {
    const { store, provider } = make();
    const { storageReference } = await provider.createUploadReference({ workerIdentityId: WORKER, documentType: "certificate" });
    // No bytes yet -> not verifiable.
    expect(await provider.verifyReference({ storageReference, workerIdentityId: WORKER })).toBe(false);
    await store.put({ key: provider.objectKey(storageReference), bytes: new Uint8Array([1, 2, 3]) });
    // Now stored -> verifiable for the owner, never for another worker.
    expect(await provider.verifyReference({ storageReference, workerIdentityId: WORKER })).toBe(true);
    expect(await provider.verifyReference({ storageReference, workerIdentityId: OTHER })).toBe(false);
  });

  it("rejects malformed references (traversal, wrong shape)", async () => {
    const { provider } = make();
    for (const bad of ["../x", `${WORKER}/t/..`, "a/b/c", `${WORKER}/type/not-a-uuid`]) {
      expect(await provider.verifyReference({ storageReference: bad, workerIdentityId: WORKER })).toBe(false);
      expect(provider.verifyUploadSignature(bad, "a".repeat(64))).toBe(false);
    }
  });

  it("uses a distinct signing scope for download URLs", async () => {
    const { provider } = make();
    const { storageReference } = await provider.createUploadReference({ workerIdentityId: WORKER, documentType: "certificate" });
    const dl = await provider.resolveDownloadUrl({ storageReference });
    const dlSig = new URL(dl!.url, "https://x").searchParams.get("dl")!;
    // A download signature must NOT pass as an upload signature (scope separation).
    expect(provider.verifyUploadSignature(storageReference, dlSig)).toBe(false);
  });
});

// The memory store accepts any key, so the real disk store must be exercised too: production hit a
// 500 on every upload because the disk store only allowed `quarantine/...` keys.
describe("local HR document storage on the real disk store", () => {
  async function withDiskProvider(run: (provider: ReturnType<typeof createLocalHrDocumentStorageProvider>) => Promise<void>) {
    const root = await mkdtemp(join(tmpdir(), "rwos-hr-docs-"));
    try {
      await run(createLocalHrDocumentStorageProvider({ store: createLocalPrivateFileObjectStore(root), secret: SECRET }));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("stores, reads back and verifies an uploaded document", async () => {
    await withDiskProvider(async (provider) => {
      const { storageReference } = await provider.createUploadReference({ workerIdentityId: WORKER, documentType: "work_authorization" });
      const key = provider.objectKey(storageReference);
      await provider.store.put({ key, bytes: new Uint8Array([1, 2, 3]) });
      expect(Array.from((await provider.store.get(key))!)).toEqual([1, 2, 3]);
      expect(await provider.verifyReference({ storageReference, workerIdentityId: WORKER })).toBe(true);
    });
  });

  it("keeps the original file name and type beside the document", async () => {
    await withDiskProvider(async (provider) => {
      const { storageReference } = await provider.createUploadReference({ workerIdentityId: WORKER, documentType: "certificate" });
      expect(await provider.describe!({ storageReference })).toBeNull();
      await provider.saveFileInfo(storageReference, { fileName: "first aid.pdf", contentType: "application/pdf" });
      expect(await provider.describe!({ storageReference })).toEqual({ fileName: "first aid.pdf", contentType: "application/pdf" });
    });
  });

  it("still rejects traversal and malformed keys", async () => {
    await withDiskProvider(async (provider) => {
      const bytes = new Uint8Array([1]);
      await expect(provider.store.put({ key: "hr/../../etc/passwd", bytes })).rejects.toThrow("invalid");
      await expect(provider.store.put({ key: `hr/${WORKER}/../x/y`, bytes })).rejects.toThrow("invalid");
      await expect(provider.store.put({ key: `hr/${WORKER}/type`, bytes })).rejects.toThrow("invalid");
    });
  });
});

describe("HR document file handling", () => {
  it("reduces an uploaded name to a safe display name", () => {
    expect(sanitizeHrDocumentFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeHrDocumentFileName("C:\\docs\\cv.pdf")).toBe("cv.pdf");
    expect(sanitizeHrDocumentFileName('a"b\r\n.pdf')).toBe("ab.pdf");
    expect(sanitizeHrDocumentFileName("..")).toBeNull();
    expect(sanitizeHrDocumentFileName(null)).toBeNull();
  });

  it("opens a file inline only when its bytes really are a PDF or image", () => {
    const text = (value: string) => new TextEncoder().encode(value);
    expect(detectViewableHrDocumentType(text("%PDF-1.7"))).toBe("application/pdf");
    expect(detectViewableHrDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectViewableHrDocumentType(text("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectViewableHrDocumentType(new Uint8Array())).toBeNull();
  });
});
