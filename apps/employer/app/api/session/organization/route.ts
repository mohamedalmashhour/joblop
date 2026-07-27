import {
  isSameOriginMutation,
  organizationContextCookieName,
  resolveClientOrganizationId,
  selectClientOrganizationId,
  sessionBoundary,
  sessionCookieOptions,
  sessionFailure
} from "../../sessionBoundary";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = await request.json().catch(() => null);
  const organizationId = readOrganizationId(input);
  if (!organizationId) return sessionFailure("denied");

  const { cookieStore, gateway, token } = await sessionBoundary();
  const result = await resolveClientOrganizationId(gateway, token, organizationId);
  if (result.status !== "ok") {
    return sessionFailure(result.status === "context_required" ? "stale" : result.status);
  }
  const selected = await selectClientOrganizationId(gateway, token, result.organizationId);
  if (selected.status !== "ok") return sessionFailure(selected.status);

  cookieStore.set(
    organizationContextCookieName,
    result.organizationId,
    sessionCookieOptions
  );
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "private, no-store" }
  });
}

function readOrganizationId(input: unknown) {
  if (typeof input !== "object" || input === null || !("organizationId" in input)) return null;
  const organizationId = (input as { organizationId?: unknown }).organizationId;
  return typeof organizationId === "string" && organizationId.length > 0
    ? organizationId
    : null;
}
