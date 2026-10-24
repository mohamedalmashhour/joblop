import {
  isSameOriginMutation,
  organizationContextCookieName,
  selectClientOrganizationId,
  sessionBoundary,
  sessionCookieOptions,
  sessionFailure
} from "../sessionBoundary";

// Round 2c: self-serve employer org creation. Creates the organization (the caller becomes its owner
// via the auto-created membership) and AUTO-SELECTS it as the active context so the rest of onboarding
// (residences, departments, contract, requests) is immediately usable. Reuses POST /organizations.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = (await request.json().catch(() => null)) as { legalName?: unknown; displayName?: unknown } | null;
  const legalName = typeof input?.legalName === "string" ? input.legalName.trim() : "";
  const displayName = typeof input?.displayName === "string" ? input.displayName.trim() : "";
  if (!legalName || !displayName || legalName.length > 200 || displayName.length > 200) {
    return sessionFailure("error");
  }
  const { cookieStore, gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const result = await gateway.request("/organizations", "POST", token, {
    legalName,
    displayName,
    idempotencyKey: `org-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  });
  if (result.status !== "ok") return sessionFailure(result.status);
  const organization = (result.payload as { organization?: { id?: string } }).organization;
  if (!organization?.id) return sessionFailure("error");

  // Make the new org the active context immediately.
  const selected = await selectClientOrganizationId(gateway, token, organization.id);
  if (selected.status === "ok") {
    cookieStore.set(organizationContextCookieName, organization.id, sessionCookieOptions);
  }
  return Response.json(
    { organization: { id: organization.id, displayName } },
    { headers: { "cache-control": "private, no-store" } }
  );
}
