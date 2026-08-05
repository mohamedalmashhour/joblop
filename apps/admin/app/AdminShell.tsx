"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { phase01Routes } from "./phase-01-review/phase01ReviewContent";

const connectedNavigation = [
  { href: "/calendar", label: "Request calendar" },
  { href: "/dispatches", label: "Dispatch reviews" }
] as const;
const reviewNavigation = phase01Routes.map(({ route, title }) => ({ href: route, label: title }));

export function AdminShell({
  children,
  staging
}: Readonly<{ children: ReactNode; staging: boolean }>) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const compiledStaging = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging";
  const connectedEnvironment =
    ["production", "staging"].includes(process.env.NEXT_PUBLIC_RWOS_ENV ?? "") ||
    compiledStaging ||
    staging;
  const navigation = connectedEnvironment
    ? connectedNavigation
    : [...connectedNavigation, ...reviewNavigation];
  const currentIndex = navigation.findIndex(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

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
      {staging || compiledStaging ? (
        <aside aria-label="Staging environment notice" className="admin-staging-banner">
          <strong>STAGING</strong>
          <span>SYNTHETIC DATA</span>
          <span>NO REAL PAYMENT</span>
          <span>NO PRODUCTION CUSTOMER DATA</span>
        </aside>
      ) : null}
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
      {currentIndex >= 0 ? (
        <PageNavigator
          currentIndex={currentIndex}
          navigation={navigation}
          sectionName="Administration"
        />
      ) : null}
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

function PageNavigator({
  currentIndex,
  navigation,
  sectionName
}: {
  currentIndex: number;
  navigation: readonly { href: string; label: string }[];
  sectionName: string;
}) {
  const previous = navigation[currentIndex - 1];
  const next = navigation[currentIndex + 1];

  return (
    <nav aria-label={`${sectionName} page navigation`} className="admin-page-navigator">
      {previous ? (
        <a
          aria-label={`Previous page: ${previous.label}`}
          className="admin-page-arrow"
          href={previous.href}
          rel="prev"
        >
          <span aria-hidden="true">←</span> Back
        </a>
      ) : (
        <span aria-disabled="true" className="admin-page-arrow admin-page-arrow-disabled">
          <span aria-hidden="true">←</span> Back
        </span>
      )}
      <div
        aria-label={`Page ${currentIndex + 1} of ${navigation.length}`}
        className="admin-page-list"
      >
        {navigation.map((item, index) => {
          const active = index === currentIndex;
          return (
            <a
              aria-current={active ? "page" : undefined}
              aria-label={`Page ${index + 1}: ${item.label}`}
              className={
                active ? "admin-page-number admin-page-number-active" : "admin-page-number"
              }
              href={item.href}
              key={item.href}
              title={item.label}
            >
              {index + 1}
            </a>
          );
        })}
      </div>
      {next ? (
        <a
          aria-label={`Next page: ${next.label}`}
          className="admin-page-arrow"
          href={next.href}
          rel="next"
        >
          Next <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span aria-disabled="true" className="admin-page-arrow admin-page-arrow-disabled">
          Next <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
