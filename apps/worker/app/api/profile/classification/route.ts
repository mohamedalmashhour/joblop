import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Set the worker's own tax classification: employee or contractor (travailleur autonome). User
// (worker)-scoped server-side; only the classification value is forwarded.
export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => null);
  const classification =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).classification === "string"
      ? ((body as Record<string, unknown>).classification as string)
      : null;
  if (classification !== "employee" && classification !== "contractor") {
    return Response.json(
      { status: "invalid", message: "classification must be employee or contractor." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }
  const result = await gateway.request("/worker/profile/classification", "PUT", token, { classification });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
