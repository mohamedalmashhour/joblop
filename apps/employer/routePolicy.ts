const publicRoutes = new Set([
  "/",
  "/about",
  "/contact",
  "/faq",
  "/forgot-password",
  "/health",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/ready",
  "/reset-password",
  "/signin",
  "/signup/employer",
  "/terms"
]);
const persistedEmployerRoutes = new Set([
  "/employer/calendar",
  "/employer/calendar/create",
  "/employer/calendar/request",
  "/employer/calendar/request/edit",
  "/employer/calendar/assignment"
]);

export function isProductionEmployerRouteAllowed(pathname: string) {
  const path = normalizePath(pathname);
  if (!path) return false;
  if (path.startsWith("/api/") || path === "/api") return true;
  if (path.startsWith("/_next/") || isStaticAsset(path)) return true;
  return publicRoutes.has(path) || persistedEmployerRoutes.has(path);
}

function normalizePath(pathname: string) {
  if (
    !pathname.startsWith("/") ||
    pathname.includes("\\") ||
    pathname.includes("..") ||
    /%2f|%5c/i.test(pathname)
  ) {
    return null;
  }
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function isStaticAsset(pathname: string) {
  return /\.(?:css|js|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(pathname);
}
