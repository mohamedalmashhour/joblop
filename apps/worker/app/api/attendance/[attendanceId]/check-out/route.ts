import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Worker check-out. Server timestamp is authoritative; version-guarded (exactly-once).
export async function POST(request: Request, context: { params: Promise<{ attendanceId: string }> }) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { attendanceId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(`/worker/attendance/${encodeURIComponent(attendanceId)}/check-out`, "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
