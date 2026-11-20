import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";
import { JOB_ALERT_PROVINCES } from "../../job-alerts/provinces";

// The signed-in worker's "Email me new jobs" alert. Worker-scoped server-side (by account email).
const noStore = { "cache-control": "private, no-store" };

export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/job-alerts", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: noStore });
}

// Start or update the alert. Only keywords (short text) and a province code are forwarded.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rawKeywords = body && typeof body.roleKeywords === "string" ? body.roleKeywords.trim() : "";
  const rawProvince = body && typeof body.province === "string" ? body.province.trim().toUpperCase() : "QC";
  if (rawKeywords.length > 120 || !(JOB_ALERT_PROVINCES as readonly string[]).includes(rawProvince)) {
    return Response.json(
      { status: "invalid", message: "Check the keywords and province." },
      { status: 400, headers: noStore }
    );
  }
  const result = await gateway.request("/worker/job-alerts", "POST", token, {
    ...(rawKeywords ? { roleKeywords: rawKeywords } : {}),
    province: rawProvince
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: noStore });
}

// Stop the alert.
export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/job-alerts", "DELETE", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: noStore });
}
