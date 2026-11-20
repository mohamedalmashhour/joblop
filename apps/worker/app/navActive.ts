// Which top-menu link is the page the visitor is on (gold underline, bold and aria-current="page").

/** True when `href` points at the current page. Outside links and in-page (#) links never match. */
export function isActivePath(pathname: string | null | undefined, href: string): boolean {
  if (!pathname || !href.startsWith("/") || href.startsWith("//") || href.includes("#")) return false;
  const target = href.split("?")[0]!.replace(/\/+$/, "") || "/";
  const current = pathname.split("?")[0]!.replace(/\/+$/, "") || "/";
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

/** aria-current value for a menu link. */
export function ariaCurrent(pathname: string | null | undefined, href: string): "page" | undefined {
  return isActivePath(pathname, href) ? "page" : undefined;
}
