import { cookies } from "next/headers";
import {
  createFrontendSessionGateway,
  localFrontendSessionCookieName,
  secureFrontendSessionCookieName
} from "@rwos/auth";
import { getRuntimeConfig } from "@rwos/config";

// The worker app is CROSS-ORG (a worker is not scoped to one employer), so unlike the
// employer BFF there is no organization-context cookie here — just the worker's own
// frontend session.
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
  process.env.NODE_ENV === "production"
    ? secureFrontendSessionCookieName
    : localFrontendSessionCookieName;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

// CSRF guard: mutations must originate from this app's own origin (mirrors the employer
// BFF). Blocks cross-site form posts even if a session cookie is present.
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

  const host = request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;
  return host !== null && originUrl.host === host && originUrl.protocol === expectedProtocol;
}

export function sessionFailure(
  status: "denied" | "not_found" | "stale" | "unavailable" | "error"
) {
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
