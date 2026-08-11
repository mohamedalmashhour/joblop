import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";

// List the worker's saved jobs (bookmarks). User(worker)-scoped server-side.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/marketplace/saved-jobs", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Save (bookmark) a job. Idempotent server-side. Only a jobRequestId is forwarded.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const jobRequestId =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).jobRequestId === "string"
      ? ((body as Record<string, unknown>).jobRequestId as string)
      : null;
  if (!jobRequestId) {
    return Response.json(
      { status: "invalid", message: "A jobRequestId is required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }
  const result = await gateway.request("/marketplace/saved-jobs", "POST", token, { jobRequestId });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
