const dispatchDetail =
  /^\/dispatches\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Transaction Control Room + per-transaction audit report (read-only).
const controlRoom = /^\/control-room(?:\/[A-Za-z0-9._-]+(?:\/report(?:\/(?:worker|employer))?)?)?$/;

// One worker's HR record.
const hrWorker = /^\/hr\/workers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// One employer order (admin order review).
const orderDetail = /^\/orders\/[A-Za-z0-9._-]+$/;

// Public, signed share links (party-scoped transaction statements).
const shareLink = /^\/s\/[A-Za-z0-9._-]+$/;

export function isProductionAdminRouteAllowed(pathname: string) {
  const path = normalizePath(pathname);
  if (!path) return false;
  if (path.startsWith("/api/") || path === "/api") return true;
  if (path.startsWith("/_next/") || isStaticAsset(path)) return true;
  return (
    path === "/health" ||
    path === "/ready" ||
    path === "/signin" ||
    path === "/signup" ||
    path === "/calendar" ||
    path === "/calendar/request" ||
    path === "/calendar/job-coverage" ||
    path === "/contact-desk" ||
    path === "/dispatches" ||
    path === "/disputes" ||
    path === "/contracts" ||
    path === "/payouts" ||
    path === "/invoices" ||
    path === "/payroll" ||
    path === "/hr" ||
    path === "/employer-plan-orders" ||
    path === "/late-cancellations" ||
    path === "/unfilled-shifts" ||
    path === "/orders" ||
    path === "/timesheets" ||
    path === "/market-wages" ||
    path === "/escalations" ||
    path === "/greetings" ||
    orderDetail.test(path) ||
    dispatchDetail.test(path) ||
    hrWorker.test(path) ||
    controlRoom.test(path) ||
    shareLink.test(path)
  );
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
