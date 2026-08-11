import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Admin verification operations queue (PLATFORM_ADMINISTRATOR, enforced by the API).
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const status = new URL(request.url).searchParams.get("status");
  const result = await gateway.request(
    `/platform/verification/queue${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
