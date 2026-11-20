import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Worker pay-channel classification as a SIGNED ELECTION (employee -> T4 / contractor -> T4A).
// GET returns the current election + the agreement versions to sign. POST records the worker's signed
// self-election (the backend ensures the worker identity exists, then appends the signed election).
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/profile/classification", "GET", token, undefined);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const classification =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).classification === "string"
      ? ((body as Record<string, unknown>).classification as string)
      : "";
  const agreementVersion =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).agreementVersion === "string"
      ? ((body as Record<string, unknown>).agreementVersion as string)
      : "";
  const agreementAccepted = typeof body === "object" && body !== null && (body as Record<string, unknown>).agreementAccepted === true;
  if (classification !== "employee" && classification !== "contractor") {
    return Response.json({ status: "invalid", message: "classification must be employee or contractor." }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  const result = await gateway.request("/worker/profile/classification-election", "POST", token, { classification, agreementVersion, agreementAccepted });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
