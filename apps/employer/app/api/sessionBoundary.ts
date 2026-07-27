import { cookies } from "next/headers";
import {
  createFrontendSessionGateway,
  localFrontendSessionCookieName,
  secureFrontendSessionCookieName
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
  process.env.NODE_ENV === "production"
    ? secureFrontendSessionCookieName
    : localFrontendSessionCookieName;

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
  const httpStatus = status === "denied" ? 401 : status === "stale" ? 409 : status === "unavailable" ? 503 : 500;
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
