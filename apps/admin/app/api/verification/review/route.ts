import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Governed admin verification decision. Routes to the worker or employer review endpoint.
// The API enforces PLATFORM_ADMINISTRATOR + audits the transition. Never a raw toggle.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as { subjectType?: string; verificationId?: string; decision?: string } | null;
  if (!body || typeof body.verificationId !== "string" || typeof body.decision !== "string") {
    return sessionFailure("not_found");
  }
  const path =
    body.subjectType === "employer"
      ? `/platform/verification/employers/${encodeURIComponent(body.verificationId)}/review`
      : `/platform/verification/workers/${encodeURIComponent(body.verificationId)}/review`;
  const result = await gateway.request(path, "POST", token, { decision: body.decision });
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
