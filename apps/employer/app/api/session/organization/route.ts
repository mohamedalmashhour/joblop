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

  cookieStore.set(organizationContextCookieName, result.organizationId, sessionCookieOptions);
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "private, no-store" }
  });
}

function readOrganizationId(input: unknown) {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).length !== 1 ||
    !("organizationId" in input)
  ) {
    return null;
  }
  const organizationId = (input as { organizationId?: unknown }).organizationId;
  return typeof organizationId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      organizationId
    )
    ? organizationId
    : null;
}
