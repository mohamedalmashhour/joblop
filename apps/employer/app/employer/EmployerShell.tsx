import type { ReactNode } from "react";
import { JobLopLogo } from "../JobLopLogo";
import { assignmentWorkflow } from "./assignmentWorkflowContent";
import { attendanceWorkflow } from "./attendanceWorkflowContent";
import { clientCalendarWorkflow } from "./calendar/clientCalendarContent";
import { employerWorkflow } from "./employerJourneyContent";
import { styles } from "./employerStyles";
import { ShellText } from "./ShellText";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import type { MessageKey } from "../i18n/messages";
import { invoiceWorkflow } from "./invoiceWorkflowContent";
import { ordersWorkflow } from "./orders/ordersContent";
import { moneyWorkflow } from "./money/moneyContent";
import { paymentWorkflow } from "./paymentWorkflowContent";
import { shiftWorkflow } from "./shifts/shiftManagementContent";
import { timesheetWorkflow } from "./timesheetWorkflowContent";

// The calendar hub is the centre of the employer platform: first in every menu.
const myCalendarStep = {
  page: "C00",
  title: "My calendar",
  route: "/employer/my-calendar",
  status: "Calendar hub",
  boundary: "Jobs and who is coming, bonus offers to answer, invoice due dates and cancellations in one calendar."
} as const;

const employerNavigation = [
  myCalendarStep,
  ...employerWorkflow,
  ...clientCalendarWorkflow,
  ...ordersWorkflow,
  ...shiftWorkflow,
  ...assignmentWorkflow,
  ...attendanceWorkflow,
  ...timesheetWorkflow,
  ...invoiceWorkflow,
  ...paymentWorkflow,
  ...moneyWorkflow
] as const;
const uniqueEmployerNavigation = deduplicateNavigationByRoute(employerNavigation);

// The deployed test tier (Render soft launch, RWOS_ENV="test"), staging, and production must all
// behave like a real connected environment: lean authenticated nav + sign-in gate, never the
// numbered prototype page-map. The full page-map is reserved for genuine LOCAL dev (RWOS_ENV unset
// or "local") so developers can still navigate every prototype surface. A compiled deployment tier
// also counts as connected.
function isConnectedEnvironment(): boolean {
  const rwosEnv = process.env.RWOS_ENV;
  const deploymentTier = process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER;
  if (rwosEnv === undefined || rwosEnv === "" || rwosEnv === "local") {
    return Boolean(deploymentTier);
  }
  return true;
}
// What a real employer sees: every working page, and no prototype pages.
const persistedEmployerNavigation: readonly { page: string; route: string; title: string; titleKey: MessageKey }[] = [
  { page: "", route: "/employer/my-calendar", title: "My calendar", titleKey: "shell.nav.myCalendar" },
  { page: "", route: "/employer/dashboard", title: "Home", titleKey: "shell.nav.home" },
  { page: "", route: "/employer/calendar/create", title: "Request workers", titleKey: "shell.nav.request" },
  { page: "", route: "/employer/calendar", title: "Request calendar", titleKey: "shell.nav.calendar" },
  { page: "", route: "/employer/orders", title: "Orders", titleKey: "shell.nav.orders" },
  { page: "", route: "/employer/assignments", title: "Assigned workers", titleKey: "shell.nav.assignments" },
  { page: "", route: "/employer/attendance", title: "Attendance", titleKey: "shell.nav.attendance" },
  { page: "", route: "/employer/timesheets", title: "Timesheets", titleKey: "shell.nav.timesheets" },
  { page: "", route: "/employer/money", title: "Money", titleKey: "shell.nav.money" },
  { page: "", route: "/employer/invoices", title: "Invoices", titleKey: "shell.nav.invoices" },
  { page: "", route: "/employer/contract", title: "Contract", titleKey: "shell.nav.contract" },
  { page: "", route: "/employer/contact-joblop", title: "Contact Joblop", titleKey: "shell.nav.contact" }
];

export function EmployerShell({
  actions,
  children,
  currentRoute,
  eyebrow,
  hideHero = false,
  lede,
  mode = "fixture",
  title
}: {
  actions?: ReactNode;
  children: ReactNode;
  currentRoute: string;
  eyebrow: string;
  hideHero?: boolean;
  lede: string;
  mode?: "fixture" | "authenticated";
  title: string;
}) {
  const staging =
    process.env.RWOS_ENV === "staging" ||
    process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging";
  const connectedEnvironment = isConnectedEnvironment();
  const effectiveMode = connectedEnvironment ? "authenticated" : mode;
  const navigation = connectedEnvironment ? persistedEmployerNavigation : uniqueEmployerNavigation;
  return (
    <div style={styles.page}>
      <a className="employer-skip-link" href="#employer-main-content">
        <ShellText k="shell.skip" />
      </a>
      <div style={styles.appFrame}>
        <aside className="employer-sidebar" style={styles.sidebarShell}>
          <a href="/" style={styles.brand} aria-label="Joblop home">
            <JobLopLogo height={34} />
          </a>
          <nav aria-label="Employer navigation" className="employer-navigation" style={styles.nav}>
            {navigation.map((step) => (
              <a
                key={step.route}
                href={step.route}
                style={step.route === currentRoute ? styles.navLinkActive : styles.navLink}
                aria-current={step.route === currentRoute ? "page" : undefined}
              >
                {step.page ? <span style={styles.navPage}>Page {step.page}</span> : null}
                <span>{"titleKey" in step ? <ShellText k={step.titleKey} /> : step.title}</span>
              </a>
            ))}
          </nav>
          <div style={styles.sidebarNote}>
            <strong>
              {effectiveMode === "authenticated" ? <ShellText k="shell.secureTitle" /> : "Fixture mode"}
            </strong>
            <span>
              {effectiveMode === "authenticated"
                ? <ShellText k="shell.secureText" />
                : "Visual workflow preview. Authoritative actions remain governed."}
            </span>
          </div>
        </aside>
        <div className="employer-workspace" style={styles.workspace}>
          <main id="employer-main-content" tabIndex={-1}>
            {staging ? <StagingSafetyBanner /> : null}
            <header style={styles.header}>
              <div>
                <p style={styles.topbarEyebrow}><ShellText k="shell.eyebrow" /></p>
                <strong style={styles.topbarTitle}>
                  {effectiveMode === "authenticated"
                    ? <ShellText k="shell.title" />
                    : "Sunrise of Oak Hill"}
                </strong>
              </div>
              <div style={styles.headerActions}>
                <a href="/employer/contact-joblop" style={styles.footerLink}><ShellText k="shell.nav.contact" /></a>
                <LanguageSwitcher />
                {actions}
              </div>
            </header>
            {hideHero ? null : (
              <>
                <section style={styles.hero}>
                  <p style={styles.eyebrow}>{eyebrow}</p>
                  <h1 style={styles.title}>{title}</h1>
                  <p style={styles.lede}>{lede}</p>
                </section>
                <EmployerPageNavigator currentRoute={currentRoute} navigation={navigation} />
              </>
            )}
            {children}
          </main>
          <footer style={styles.footer}>
            <span><ShellText k="shell.footer" /></span>
            <nav aria-label="Employer footer navigation" style={styles.footerLinks}>
              <a href="/employer/contact-joblop" style={styles.footerLink}>
                <ShellText k="shell.nav.contact" />
              </a>
              <a href="/employer/inbox" style={styles.footerLink}>
                <ShellText k="shell.greetings" />
              </a>
              <a href="/contact" style={styles.footerLink}>
                <ShellText k="shell.support" />
              </a>
              <a href="/faq" style={styles.footerLink}>
                <ShellText k="shell.faq" />
              </a>
              <a href="/pricing" style={styles.footerLink}>
                <ShellText k="shell.pricing" />
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </div>
  );
}

function StagingSafetyBanner() {
  // role="status" is a live region; it must sit on a generic element — an <aside> has an implicit
  // role of complementary, which disallows the override (axe aria-allowed-role).
  return (
    <div aria-label="Staging safety status" role="status" style={styles.stagingBanner}>
      <strong>STAGING</strong>
      <span>SYNTHETIC DATA</span>
      <span>NO REAL PAYMENT</span>
      <span>NO PRODUCTION CUSTOMER DATA</span>
    </div>
  );
}

function EmployerPageNavigator({
  currentRoute,
  navigation
}: {
  currentRoute: string;
  navigation: readonly {
    page: string;
    route: string;
    title: string;
  }[];
}) {
  const currentIndex = navigation.findIndex((step) => step.route === currentRoute);
  if (currentIndex < 0) return null;
  const previous = navigation[currentIndex - 1];
  const next = navigation[currentIndex + 1];

  return (
    <nav aria-label="Employer workflow page navigation" className="employer-page-navigator">
      {previous ? (
        <a
          aria-label={`Previous page: ${previous.title}`}
          className="employer-page-arrow"
          href={previous.route}
          rel="prev"
        >
          <span aria-hidden="true">←</span> <ShellText k="shell.back" />
        </a>
      ) : (
        <span aria-disabled="true" className="employer-page-arrow employer-page-arrow-disabled">
          <span aria-hidden="true">←</span> <ShellText k="shell.back" />
        </span>
      )}
      <div
        aria-label={`Page ${currentIndex + 1} of ${navigation.length}`}
        className="employer-page-list"
      >
        {navigation.map((step, index) => {
          const active = index === currentIndex;
          return (
            <a
              aria-current={active ? "page" : undefined}
              aria-label={`Page ${index + 1}: ${step.title}`}
              className={
                active ? "employer-page-number employer-page-number-active" : "employer-page-number"
              }
              href={step.route}
              key={step.route}
              title={step.title}
            >
              {index + 1}
            </a>
          );
        })}
      </div>
      {next ? (
        <a
          aria-label={`Next page: ${next.title}`}
          className="employer-page-arrow"
          href={next.route}
          rel="next"
        >
          <ShellText k="shell.next" /> <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span aria-disabled="true" className="employer-page-arrow employer-page-arrow-disabled">
          <ShellText k="shell.next" /> <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}

export function WorkflowRoutes({ currentRoute }: { currentRoute: string }) {
  // The numbered workflow map is a prototype tool. Real employers use the sidebar and home page.
  if (isConnectedEnvironment()) return null;
  const navigation = uniqueEmployerNavigation;
  return (
    <section aria-labelledby="workflow-title" style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Employer workflow</p>
        <h2 id="workflow-title" style={styles.sectionTitle}>
          Continue through the governed onboarding sequence.
        </h2>
      </div>
      <div style={styles.routeGrid}>
        {navigation.map((step) => (
          <a key={step.route} href={step.route} style={styles.routeCard}>
            <span style={styles.routeStatus}>
              Page {step.page} {step.route === currentRoute ? "Current" : step.status}
            </span>
            <strong style={styles.cardTitle}>{step.title}</strong>
            <span style={styles.cardText}>{step.boundary}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function deduplicateNavigationByRoute<T extends { route: string }>(
  navigation: readonly T[]
): readonly T[] {
  const unique = new Map<string, T>();
  for (const step of navigation) {
    unique.set(step.route, step);
  }
  return [...unique.values()];
}
