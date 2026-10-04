import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../sessionBoundary";

const privateHeaders = { "cache-control": "private, no-store" };

export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/market-wages", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

// Upsert one market-wage reference (role + province). Reference data only.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const roleDefinitionId = typeof body?.roleDefinitionId === "string" ? body.roleDefinitionId : null;
  const province = typeof body?.province === "string" ? body.province : null;
  const medianHourlyRateMinor = typeof body?.medianHourlyRateMinor === "number" ? body.medianHourlyRateMinor : null;
  if (!roleDefinitionId || !province || medianHourlyRateMinor === null) {
    return Response.json({ status: "invalid", message: "A role, province and rate are required." }, { status: 400, headers: privateHeaders });
  }
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/platform/market-wages", "POST", token, {
    roleDefinitionId,
    province,
    medianHourlyRateMinor,
    currency: typeof body?.currency === "string" ? body.currency : "CAD",
    source: typeof body?.source === "string" ? body.source : null
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
