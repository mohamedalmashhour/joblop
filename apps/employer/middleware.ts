import { NextResponse, type NextRequest } from "next/server";
import { isProductionEmployerRouteAllowed } from "./routePolicy";

export async function middleware(request: NextRequest) {
  if (
    isConnectedRuntimeEnvironment() &&
    !isProductionEmployerRouteAllowed(request.nextUrl.pathname)
  ) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
  if (isConnectedRuntimeEnvironment() && isProtectedEmployerPage(request.nextUrl.pathname)) {
    const token = request.cookies.get("__Host-rwos_employer_session")?.value;
    if (!token) return NextResponse.redirect(new URL("/employer/calendar", request.url));
    const origin = process.env.INTERNAL_API_ORIGIN;
    if (!origin) return new NextResponse("Service Unavailable", { status: 503 });
    try {
      const response = await fetch(`${new URL(origin).origin}/memberships`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!response.ok) {
        return response.status === 401 || response.status === 403
          ? NextResponse.redirect(new URL("/employer/calendar", request.url))
          : new NextResponse("Service Unavailable", { status: 503 });
      }
      const payload = (await response.json()) as { memberships?: unknown };
      const activeOrganizationIds = Array.isArray(payload.memberships)
        ? payload.memberships.flatMap((membership) => {
            if (typeof membership !== "object" || membership === null) return [];
            const record = membership as Record<string, unknown>;
            return record.status === "active" && typeof record.organizationId === "string"
              ? [record.organizationId]
              : [];
          })
        : [];
      const selected = request.cookies.get("__Host-rwos_organization_context")?.value;
      const organizationId =
        selected ?? (activeOrganizationIds.length === 1 ? activeOrganizationIds[0] : null);
      if (
        !activeOrganizationIds.length ||
        !organizationId ||
        !activeOrganizationIds.includes(organizationId)
      ) {
        return NextResponse.redirect(new URL("/employer/calendar", request.url));
      }
      const capability = await fetch(
        `${new URL(origin).origin}/authz/employer-calendar/session?organizationId=${encodeURIComponent(organizationId)}`,
        {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${token}` },
          cache: "no-store"
        }
      );
      if (!capability.ok) {
        return capability.status === 401 || capability.status === 403
          ? NextResponse.redirect(new URL("/employer/calendar", request.url))
          : new NextResponse("Service Unavailable", { status: 503 });
      }
      const capabilityPayload: unknown = await capability.json();
      if (!hasEmployerCalendarCapability(capabilityPayload, organizationId)) {
        return new NextResponse("Service Unavailable", { status: 503 });
      }
    } catch {
      return new NextResponse("Service Unavailable", { status: 503 });
    }
  }
  const response = NextResponse.next();
  if (process.env.RWOS_ENV === "production") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export function isConnectedRuntimeEnvironment(value = process.env.RWOS_ENV) {
  return value === "staging" || value === "production";
}

export const config = { matcher: "/:path*" };

function isProtectedEmployerPage(pathname: string) {
  return (
    pathname === "/employer/calendar/create" ||
    pathname === "/employer/calendar/request" ||
    pathname === "/employer/calendar/request/edit" ||
    pathname === "/employer/calendar/assignment"
  );
}

export function hasEmployerCalendarCapability(input: unknown, expectedOrganizationId: string) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  const organization = record.organization;
  return (
    record.authorized === true &&
    record.capability === "employer_calendar_read" &&
    typeof organization === "object" &&
    organization !== null &&
    !Array.isArray(organization) &&
    (organization as Record<string, unknown>).id === expectedOrganizationId
  );
}
