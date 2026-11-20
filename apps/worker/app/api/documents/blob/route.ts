import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Receive the document file bytes from the worker's browser (a same-origin PUT) and forward them to
// the API as base64 JSON, keeping the file transfer same-origin (no cross-origin CORS) and off the
// public API surface. The signed reference (ref + sig) comes from /api/documents/upload-reference.
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // mirror the API cap

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const sig = url.searchParams.get("sig");
  if (!ref || !sig) return sessionFailure("error");

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length === 0) {
    return Response.json({ error: "empty" }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  if (buffer.length > MAX_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413, headers: { "cache-control": "private, no-store" } });
  }

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const result = await gateway.request("/hr/documents/blob", "POST", token, {
    ref,
    sig,
    contentType,
    fileName: url.searchParams.get("name"),
    dataBase64: buffer.toString("base64")
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload ?? { ok: true }, { headers: { "cache-control": "private, no-store" } });
}
