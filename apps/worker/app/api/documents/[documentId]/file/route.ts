import { getRuntimeConfig } from "@rwos/config";
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export const runtime = "nodejs";

// Stream the worker's own document back to their browser. The API enforces ownership and decides
// whether the file may open inline. The headers below stop an opened file from running anything.
export async function GET(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { documentId } = await context.params;
  const mode = new URL(request.url).searchParams.get("mode") === "view" ? "view" : "save";
  try {
    const response = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/hr/documents/${encodeURIComponent(documentId)}/file?mode=${mode}`,
      { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (response.status === 401 || response.status === 403) return sessionFailure("denied");
    if (response.status === 404) return sessionFailure("not_found");
    if (!response.ok) return sessionFailure("error");
    return new Response(response.body, {
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/octet-stream",
        "content-disposition": response.headers.get("content-disposition") ?? "attachment",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'self'; frame-ancestors 'none'"
      }
    });
  } catch {
    return sessionFailure("unavailable");
  }
}
