import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../sessionBoundary";

// Worker CV builder: generate the signed-in worker's own CV + cover letter. Advisory; nothing sent.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request("/worker/cv", "POST", token, body);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
