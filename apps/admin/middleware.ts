import { NextResponse, type NextRequest } from "next/server";
import { isProductionAdminRouteAllowed } from "./routePolicy";

export async function middleware(request: NextRequest) {
  if (isConnectedRuntimeEnvironment() && isConnectedAdminEntry(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  if (isConnectedRuntimeEnvironment() && !isProductionAdminRouteAllowed(request.nextUrl.pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
  if (isConnectedRuntimeEnvironment() && isProtectedAdminPage(request.nextUrl.pathname)) {
    const token = request.cookies.get("__Host-rwos_admin_session")?.value;
    if (!token) return NextResponse.redirect(new URL("/calendar", request.url));
    const origin = process.env.INTERNAL_API_ORIGIN;
    if (!origin) return new NextResponse("Service Unavailable", { status: 503 });
    try {
      const authorization = await fetch(`${new URL(origin).origin}/authz/platform-admin/session`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!authorization.ok) {
        return authorization.status === 401 || authorization.status === 403
          ? NextResponse.redirect(new URL("/calendar", request.url))
          : new NextResponse("Service Unavailable", { status: 503 });
      }
      if (!hasPlatformAdminAuthorization(await authorization.json())) {
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

export function isConnectedAdminEntry(pathname: string) {
  return pathname === "/";
}

export const config = { matcher: "/:path*" };

function isProtectedAdminPage(pathname: string) {
  return (
    pathname === "/calendar/request" ||
    pathname === "/dispatches" ||
    pathname.startsWith("/dispatches/")
  );
}

export function hasPlatformAdminAuthorization(input: unknown) {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>).authorized === true
  );
}
