import { NextResponse, type NextRequest } from "next/server";

// The whole CRM is staff-only, so in a connected environment (staging/production) every page except
// the sign-in screen is gated at the edge: the CRM session cookie must be present AND the API must
// confirm platform-administrator authority. API routes gate themselves (BFF → API), so they pass
// through here. This is defence in depth: each CRM API route is still authority-checked server-side.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isConnectedRuntimeEnvironment() || !isProtectedPage(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }
  const token = request.cookies.get("__Host-rwos_crm_session")?.value;
  if (!token) return NextResponse.redirect(signInWithReturn(request));
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
        ? NextResponse.redirect(signInWithReturn(request))
        : new NextResponse("Service Unavailable", { status: 503 });
    }
    if (!hasPlatformAdminAuthorization(await authorization.json())) {
      return new NextResponse("Service Unavailable", { status: 503 });
    }
  } catch {
    return new NextResponse("Service Unavailable", { status: 503 });
  }
  return withSecurityHeaders(NextResponse.next());
}

function withSecurityHeaders(response: NextResponse) {
  if (process.env.RWOS_ENV === "production") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function signInWithReturn(request: NextRequest) {
  const url = new URL("/signin", request.url);
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return url;
}

export function isConnectedRuntimeEnvironment(value = process.env.RWOS_ENV) {
  return value === "staging" || value === "production";
}

// Pages are protected; the sign-in screen, API routes, health/ready probes, Next internals and static
// assets are not (API routes enforce authority themselves on every call).
export function isProtectedPage(pathname: string) {
  if (
    pathname === "/signin" ||
    pathname === "/health" ||
    pathname === "/ready" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-touch-icon.png"
  ) {
    return false;
  }
  return true;
}

export function hasPlatformAdminAuthorization(input: unknown) {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>).authorized === true
  );
}

export const config = { matcher: "/:path*" };
