"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const navigation = [
  { href: "/calendar", label: "Request calendar" },
  { href: "/dispatches", label: "Dispatch reviews" }
] as const;

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = contentRef.current?.querySelector("main");
    if (!main) return;
    main.id = "admin-main-content";
    main.tabIndex = -1;
  }, [pathname]);

  return (
    <div className="admin-app-shell">
      <a className="admin-skip-link" href="#admin-main-content">
        Skip to main content
      </a>
      <header className="admin-topbar">
        <a
          aria-label="Resident Workforce OS administration home"
          className="admin-brand"
          href="/calendar"
        >
          <span aria-hidden="true" className="admin-brand-mark">
            RW
          </span>
          <span>
            <strong>Resident Workforce OS</strong>
            <small>Administration · governed operations</small>
          </span>
        </a>
        <p className="admin-session-context">
          Secure administration workspace · authority is verified before persisted data is shown
        </p>
      </header>
      <nav aria-label="Administration navigation" className="admin-navigation">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <a
              aria-current={active ? "page" : undefined}
              className={active ? "admin-nav-link admin-nav-link-active" : "admin-nav-link"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
