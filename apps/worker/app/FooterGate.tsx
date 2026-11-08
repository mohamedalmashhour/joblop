"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// /browse renders its own full footer (with the legal links and company name), so the global footer
// is skipped there to avoid two footers stacked on the same page.
export const PAGES_WITH_OWN_FOOTER: readonly string[] = ["/browse"];

export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname && PAGES_WITH_OWN_FOOTER.includes(pathname)) return null;
  return <>{children}</>;
}
