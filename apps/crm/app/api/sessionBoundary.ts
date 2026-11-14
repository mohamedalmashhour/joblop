import { cookies } from "next/headers";
import {
  createFrontendSessionGateway,
  localCrmSessionCookieName,
  secureCrmSessionCookieName
} from "@rwos/auth";
import { getRuntimeConfig } from "@rwos/config";

export async function sessionBoundary() {
  const cookieStore = await cookies();
  return {
    cookieStore,
    token: cookieStore.get(sessionCookieName)?.value ?? null,
    gateway: createFrontendSessionGateway({
      apiOrigin: getRuntimeConfig().internalApiOrigin,
      fetch
    })
  };
}

export const sessionCookieName =
  process.env.NODE_ENV === "production" ? secureCrmSessionCookieName : localCrmSessionCookieName;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || fetchSite === "cross-site") return false;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  if (originUrl.origin === requestUrl.origin) return true;

  // Next can normalize the request URL host while preserving the public Host header. Require an exact
  // browser Origin/Host and protocol match.
  const host = request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;
  return host !== null && originUrl.host === host && originUrl.protocol === expectedProtocol;
}

export function sessionFailure(status: "denied" | "not_found" | "stale" | "unavailable" | "error") {
  const httpStatus =
    status === "denied"
      ? 401
      : status === "not_found"
        ? 404
        : status === "stale"
          ? 409
          : status === "unavailable"
            ? 503
            : 500;
  return Response.json(
    {
      status,
      message:
        status === "denied"
          ? "Authentication required."
          : status === "not_found"
            ? "Resource unavailable."
            : status === "stale"
              ? "Information changed. Refresh and try again."
              : status === "unavailable"
                ? "Service unavailable."
                : "Request could not be completed."
    },
    { status: httpStatus, headers: { "cache-control": "private, no-store" } }
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as unknown;
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
