import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Get a provider upload reference (the worker uploads to the storage provider, not JobLop).
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request("/hr/documents/upload-reference", "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
