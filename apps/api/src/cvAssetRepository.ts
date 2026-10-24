import type { PrismaClient } from "@rwos/database";

// JobScanner CV attachments: worker-owned certificates + optional photo. Bytes stored inline (small,
// validated). Certificates are referenced on the CV; the photo is optional (discouraged on Québec CVs).
// No governance workflow, no money.

export const CV_ASSET_KINDS = ["certificate", "photo"] as const;
export type CvAssetKind = (typeof CV_ASSET_KINDS)[number];

const ALLOWED_CONTENT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const CV_ASSET_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic-byte sniff so the declared content type can't lie (defence in depth).
function detectContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export type CvAssetView = Readonly<{
  id: string;
  workerRef: string;
  kind: CvAssetKind;
  label: string | null;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
}>;

export type CreateCvAssetInput = Readonly<{
  workerRef: string;
  kind: string;
  label?: string | null;
  filename: string;
  declaredContentType: string;
  dataBase64: string;
}>;

export type CreateCvAssetResult =
  | { ok: true; asset: CvAssetView }
  | { ok: false; reason: "invalid_kind" | "too_large" | "empty" | "type_mismatch" | "bad_filename" };

export async function createCvAsset(prisma: PrismaClient, input: CreateCvAssetInput): Promise<CreateCvAssetResult> {
  if (!CV_ASSET_KINDS.includes(input.kind as CvAssetKind)) return { ok: false, reason: "invalid_kind" };
  const filename = input.filename.normalize("NFC").trim();
  if (!filename || filename.length > 120 || /[/\\]/.test(filename) || filename.includes("..")) {
    return { ok: false, reason: "bad_filename" };
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.dataBase64, "base64");
  } catch {
    return { ok: false, reason: "empty" };
  }
  if (bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (bytes.byteLength > CV_ASSET_MAX_BYTES) return { ok: false, reason: "too_large" };
  const detected = detectContentType(new Uint8Array(bytes));
  if (!detected || !ALLOWED_CONTENT_TYPES.has(detected) || detected !== input.declaredContentType) {
    return { ok: false, reason: "type_mismatch" };
  }
  const row = await prisma.cvAsset.create({
    data: {
      workerRef: input.workerRef,
      kind: input.kind,
      label: input.label ?? null,
      filename,
      contentType: detected,
      size: bytes.byteLength,
      data: Uint8Array.from(bytes)
    },
    select: { id: true, workerRef: true, kind: true, label: true, filename: true, contentType: true, size: true, createdAt: true }
  });
  return {
    ok: true,
    asset: {
      id: row.id,
      workerRef: row.workerRef,
      kind: row.kind as CvAssetKind,
      label: row.label,
      filename: row.filename,
      contentType: row.contentType,
      size: row.size,
      createdAt: row.createdAt.toISOString()
    }
  };
}

/** List a worker's CV assets (metadata only — never returns the bytes). */
export async function listCvAssets(prisma: PrismaClient, workerRef: string): Promise<CvAssetView[]> {
  const rows = await prisma.cvAsset.findMany({
    where: { workerRef },
    orderBy: { createdAt: "desc" },
    select: { id: true, workerRef: true, kind: true, label: true, filename: true, contentType: true, size: true, createdAt: true }
  });
  return rows.map((r) => ({
    id: r.id,
    workerRef: r.workerRef,
    kind: r.kind as CvAssetKind,
    label: r.label,
    filename: r.filename,
    contentType: r.contentType,
    size: r.size,
    createdAt: r.createdAt.toISOString()
  }));
}

export async function deleteCvAsset(prisma: PrismaClient, workerRef: string, id: string): Promise<boolean> {
  const res = await prisma.cvAsset.deleteMany({ where: { id, workerRef } });
  return res.count === 1;
}
