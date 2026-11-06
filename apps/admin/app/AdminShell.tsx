"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { phase01Routes } from "./phase-01-review/phase01ReviewContent";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useT, type Translate } from "./i18n/LocaleProvider";
import type { MessageKey } from "./i18n/messages";

// Navigation carries a translation key (labelKey) where a catalogue entry exists; the phase-01
// review routes bring their own (English) title and keep it until those deep pages are translated.
const connectedNavigation = [
  { href: "/calendar", labelKey: "nav.calendar" },
  { href: "/orders", labelKey: "nav.orders" },
  { href: "/dispatches", labelKey: "nav.dispatches" },
  { href: "/timesheets", labelKey: "nav.timesheets" },
  { href: "/market-wages", labelKey: "nav.marketWages" },
  { href: "/escalations", labelKey: "nav.escalations" },
  { href: "/greetings", labelKey: "nav.greetings" }
] as const satisfies readonly { href: string; labelKey: MessageKey }[];
const reviewNavigation = phase01Routes.map(({ route, title }) => ({ href: route, label: title }));
// Calendar + finance surfaces that carry their own (English) label until a catalogue key is added.
const financeNavigation = [
  { href: "/calendar/lifecycle", label: "Lifecycle calendar" },
  { href: "/finance/calendar", label: "Billing calendar" }
] as const satisfies readonly { href: string; label: string }[];
// Platform operations surfaces not in the phase-01 review set.
const operationsNavigation = [
  { href: "/verification", labelKey: "nav.verification" },
  { href: "/hr", labelKey: "nav.hr" },
  { href: "/payroll", labelKey: "nav.payroll" },
  { href: "/disputes", labelKey: "nav.disputes" }
] as const satisfies readonly { href: string; labelKey: MessageKey }[];

type NavSource = { href: string; labelKey?: MessageKey; label?: string };
type NavItem = { href: string; label: string };

// Resolve each navigation entry's visible label: translate when it has a catalogue key, otherwise
// fall back to the entry's own (phase-01 review) title.
function resolveNavigation(source: readonly NavSource[], t: Translate): NavItem[] {
  return source.map((item) => ({
    href: item.href,
    label: item.labelKey ? t(item.labelKey) : item.label ?? item.href
  }));
}

// Platform sections organized into named groups (capsules), mirroring the SYBNB grouped-nav
// pattern — every route belongs to a section so the workspace reads as coherent groups
// instead of one long flat list.
const NAV_GROUPS: readonly { group: string; hrefs: readonly string[] }[] = [
  { group: "Operations", hrefs: ["/calendar", "/calendar/lifecycle", "/orders", "/dispatches", "/timesheets", "/shifts"] },
  { group: "Directory", hrefs: ["/workers", "/employers", "/residences"] },
  { group: "Finance & payroll", hrefs: ["/finance", "/finance/calendar", "/payroll", "/disputes", "/market-wages"] },
  { group: "People & trust", hrefs: ["/verification", "/hr"] },
  { group: "Governance & compliance", hrefs: ["/escalations", "/compliance", "/audit-log", "/reports"] },
  { group: "Platform", hrefs: ["/greetings", "/system-settings", "/platform-analytics", "/notification-center", "/ai-control-center"] }
];

// Bucket the active navigation into ordered groups, preserving each group's declared order.
// Any route not assigned to a group falls into a trailing "More" group so nothing is dropped.
function groupNavigation(navigation: readonly NavItem[]): { group: string; items: NavItem[] }[] {
  const byHref = new Map(navigation.map((item) => [item.href, item]));
  const used = new Set<string>();
  const groups: { group: string; items: NavItem[] }[] = [];
  for (const { group, hrefs } of NAV_GROUPS) {
    const items: NavItem[] = [];
    for (const href of hrefs) {
      const item = byHref.get(href);
      if (item) {
        items.push(item);
        used.add(href);
      }
    }
    if (items.length > 0) groups.push({ group, items });
  }
  const leftovers = navigation.filter((item) => !used.has(item.href));
  if (leftovers.length > 0) groups.push({ group: "More", items: [...leftovers] });
  return groups;
}

export function AdminShell({
  children,
  connected = false,
  staging
}: Readonly<{ children: ReactNode; connected?: boolean; staging: boolean }>) {
  const pathname = usePathname();
  const t = useT();
  const contentRef = useRef<HTMLDivElement>(null);
  const compiledStaging = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging";
  // `connected` is the server-authoritative signal (RWOS_ENV !== local/unset), so the deployed test
  // tier shows the lean nav, not the prototype page-map. The NEXT_PUBLIC checks remain as a
  // compiled-in fallback for environments where only the public vars are set.
  const connectedEnvironment =
    connected ||
    ["production", "staging"].includes(process.env.NEXT_PUBLIC_RWOS_ENV ?? "") ||
    compiledStaging ||
    staging;
  const navigation = connectedEnvironment
    ? connectedNavigation
    : [...connectedNavigation, ...operationsNavigation, ...reviewNavigation, ...financeNavigation];
  const resolvedNavigation = resolveNavigation(navigation as readonly NavSource[], t);
  const currentIndex = resolvedNavigation.findIndex(
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
        {t("shell.skip")}
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
        <a aria-label={t("shell.brandHomeAria")} className="admin-brand" href="/calendar">
          { /* eslint-disable-next-line @next/next/no-img-element */ }
          <img
            src="/img/joblop-logo.png"
            alt="Joblop"
            style={{ height: 30, width: "auto", display: "block", borderRadius: 6 }}
          />
          <span>
            <strong>{t("shell.brandTitle")}</strong>
            <small>{t("shell.brandSub")}</small>
          </span>
        </a>
        <p className="admin-session-context">{t("shell.sessionContext")}</p>
        <LanguageSwitcher />
      </header>
      <nav aria-label={t("shell.navAria")} className="admin-navigation">
        {groupNavigation(resolvedNavigation).map(({ group, items }) => (
          <div aria-label={group} className="admin-nav-group" key={group} role="group">
            <span className="admin-nav-group-label">{t(`group.${group}` as MessageKey)}</span>
            <div className="admin-nav-group-links">
              {items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>
      {currentIndex >= 0 ? (
        <PageNavigator
          backLabel={t("page.back")}
          currentIndex={currentIndex}
          navigation={resolvedNavigation}
          nextLabel={t("page.next")}
          sectionName={t("shell.brandTitle")}
        />
      ) : null}
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

function PageNavigator({
  backLabel,
  currentIndex,
  navigation,
  nextLabel,
  sectionName
}: {
  backLabel: string;
  currentIndex: number;
  navigation: readonly { href: string; label: string }[];
  nextLabel: string;
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
          <span aria-hidden="true">←</span> {backLabel}
        </a>
      ) : (
        <span aria-disabled="true" className="admin-page-arrow admin-page-arrow-disabled">
          <span aria-hidden="true">←</span> {backLabel}
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
              key={`${item.href}-${index}`}
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
          {nextLabel} <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span aria-disabled="true" className="admin-page-arrow admin-page-arrow-disabled">
          {nextLabel} <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
