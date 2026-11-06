// Shared CSRF-state cookie name/path for the Google OAuth start→callback handshake. Kept out of the
// route files because Next.js route modules may only export HTTP handlers + route config.
export const GOOGLE_STATE_COOKIE = "rwos_google_oauth_state";
export const GOOGLE_STATE_PATH = "/api/auth/google";

// The address the visitor is really on. Behind a host's proxy, request.url is the server's internal
// address (https://0.0.0.0:10000 on Render), which Google refuses as a return address, so the proxy's
// forwarded host is preferred. Google still checks the result against its own allowed list.
export function publicOrigin(request: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site && /^https?:\/\//.test(site)) return site.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost && /^[a-z0-9.-]+(:\d+)?$/i.test(forwardedHost)) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    return `${proto === "http" ? "http" : "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}
