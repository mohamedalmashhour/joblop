const publicRoutes = new Set([
  "/",
  "/about",
  "/contact",
  "/faq",
  "/health",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/ready",
  "/signin",
  "/signup/employer",
  "/terms"
]);
const persistedEmployerRoutes = new Set([
  "/employer",
  "/employer/dashboard",
  "/employer/my-calendar",
  "/employer/company",
  "/employer/onboarding/company",
  "/employer/onboarding/residences",
  "/employer/onboarding/departments",
  "/employer/assignments",
  "/employer/attendance",
  "/employer/timesheets",
  "/employer/payments",
  "/employer/contract",
  "/employer/verification",
  "/employer/contact-joblop",
  "/employer/inbox",
  "/employer/calendar",
  "/employer/calendar/create",
  "/employer/calendar/request",
  "/employer/calendar/request/edit",
  "/employer/calendar/assignment",
  "/employer/orders",
  "/employer/orders/create",
  "/employer/money",
  "/employer/invoices",
  "/employer/invoices/detail",
  "/employer/invoices/breakdown"
]);
const orderDetail =
  /^\/employer\/orders\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProductionEmployerRouteAllowed(pathname: string) {
  const path = normalizePath(pathname);
  if (!path) return false;
  if (path.startsWith("/api/") || path === "/api") return true;
  if (path.startsWith("/_next/") || isStaticAsset(path)) return true;
  return publicRoutes.has(path) || persistedEmployerRoutes.has(path) || orderDetail.test(path);
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
