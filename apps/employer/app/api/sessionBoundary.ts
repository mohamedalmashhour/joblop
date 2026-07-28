import { cookies } from "next/headers";
import {
  createFrontendSessionGateway,
  localEmployerSessionCookieName,
  secureEmployerSessionCookieName
} from "@rwos/auth";
import { getRuntimeConfig } from "@rwos/config";

export async function sessionBoundary() {
  const cookieStore = await cookies();
  return {
    cookieStore,
    token: cookieStore.get(sessionCookieName)?.value ?? null,
    organizationId: cookieStore.get(organizationContextCookieName)?.value ?? null,
    gateway: createFrontendSessionGateway({
      apiOrigin: getRuntimeConfig().internalApiOrigin,
      fetch
    })
  };
}

export const sessionCookieName =
  process.env.NODE_ENV === "production"
    ? secureEmployerSessionCookieName
    : localEmployerSessionCookieName;

export const organizationContextCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-rwos_organization_context"
    : "rwos_local_organization_context";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin && fetchSite !== "cross-site";
}

export function sessionFailure(status: "denied" | "stale" | "unavailable" | "error") {
  const httpStatus =
    status === "denied" ? 401 : status === "stale" ? 409 : status === "unavailable" ? 503 : 500;
  return Response.json(
    {
      status,
      message:
        status === "denied"
          ? "Authentication required."
          : status === "stale"
            ? "Calendar information changed. Refresh and try again."
            : status === "unavailable"
              ? "Service unavailable."
              : "Request could not be completed."
    },
    {
      status: httpStatus,
      headers: { "cache-control": "private, no-store" }
    }
  );
}

export async function resolveClientOrganizationId(
  gateway: Awaited<ReturnType<typeof sessionBoundary>>["gateway"],
  token: string | null,
  selectedOrganizationId: string | null
) {
  if (!token) return { status: "denied" } as const;
  const membershipResult = await gateway.request("/memberships", "GET", token);
  if (membershipResult.status !== "ok") return membershipResult;
  const organizations = parseOrganizationChoices(membershipResult.payload);
  if (!organizations.length) return { status: "denied" } as const;

  const organizationId = selectedOrganizationId
    ? organizations.find((organization) => organization.id === selectedOrganizationId)?.id
    : organizations.length === 1
      ? organizations[0]?.id
      : null;

  if (!organizationId) {
    return { status: "context_required", organizations } as const;
  }

  const capability = await gateway.request(
    `/authz/employer-calendar/session?organizationId=${encodeURIComponent(organizationId)}`,
    "GET",
    token
  );
  if (capability.status !== "ok") return capability;
  if (!hasEmployerCalendarCapability(capability.payload, organizationId)) {
    return { status: "error" } as const;
  }
  return { status: "ok", organizationId } as const;
}

export async function selectClientOrganizationId(
  gateway: Awaited<ReturnType<typeof sessionBoundary>>["gateway"],
  token: string | null,
  organizationId: string
) {
  return gateway.request("/memberships/context/select", "POST", token, { organizationId });
}

export type EmployerOrganizationChoice = Readonly<{
  id: string;
  publicId: string;
  displayName: string;
}>;

export function parseOrganizationChoices(input: unknown): readonly EmployerOrganizationChoice[] {
  if (typeof input !== "object" || input === null || !("memberships" in input)) return [];
  const memberships = (input as { memberships?: unknown }).memberships;
  if (!Array.isArray(memberships)) return [];
  return memberships.flatMap((membership) => {
    if (typeof membership !== "object" || membership === null) return [];
    const record = membership as Record<string, unknown>;
    if (
      record.status !== "active" ||
      typeof record.organizationId !== "string" ||
      typeof record.organizationPublicId !== "string" ||
      typeof record.organizationDisplayName !== "string"
    ) {
      return [];
    }
    return [
      {
        id: record.organizationId,
        publicId: record.organizationPublicId,
        displayName: record.organizationDisplayName
      }
    ];
  });
}

function hasEmployerCalendarCapability(input: unknown, expectedOrganizationId: string) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  if (record.authorized !== true || record.capability !== "employer_calendar_read") return false;
  const organization = record.organization;
  return (
    typeof organization === "object" &&
    organization !== null &&
    !Array.isArray(organization) &&
    (organization as Record<string, unknown>).id === expectedOrganizationId
  );
}
