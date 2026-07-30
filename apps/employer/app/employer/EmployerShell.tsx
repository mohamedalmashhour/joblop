import type { ReactNode } from "react";
import { assignmentWorkflow } from "./assignmentWorkflowContent";
import { attendanceWorkflow } from "./attendanceWorkflowContent";
import { clientCalendarWorkflow } from "./calendar/clientCalendarContent";
import { employerWorkflow } from "./employerJourneyContent";
import { styles } from "./employerStyles";
import { invoiceWorkflow } from "./invoiceWorkflowContent";
import { paymentWorkflow } from "./paymentWorkflowContent";
import { shiftWorkflow } from "./shifts/shiftManagementContent";
import { timesheetWorkflow } from "./timesheetWorkflowContent";

const employerNavigation = [
  ...employerWorkflow,
  ...clientCalendarWorkflow,
  ...shiftWorkflow,
  ...assignmentWorkflow,
  ...attendanceWorkflow,
  ...timesheetWorkflow,
  ...invoiceWorkflow,
  ...paymentWorkflow
] as const;
const persistedEmployerNavigation = clientCalendarWorkflow.filter((step) =>
  ["/employer/calendar", "/employer/calendar/create"].includes(step.route)
);

export function EmployerShell({
  actions,
  children,
  currentRoute,
  eyebrow,
  lede,
  mode = "fixture",
  title
}: {
  actions?: ReactNode;
  children: ReactNode;
  currentRoute: string;
  eyebrow: string;
  lede: string;
  mode?: "fixture" | "authenticated";
  title: string;
}) {
  const production = process.env.RWOS_ENV === "production";
  const effectiveMode = production ? "authenticated" : mode;
  const navigation =
    effectiveMode === "authenticated" ? persistedEmployerNavigation : employerNavigation;
  return (
    <div style={styles.page}>
      <a className="employer-skip-link" href="#employer-main-content">
        Skip to employer workspace
      </a>
      <div style={styles.appFrame}>
        <aside className="employer-sidebar" style={styles.sidebarShell}>
          <a href="/" style={styles.brand} aria-label="Resident Job home">
            <span aria-hidden="true" style={styles.brandMark}>
              RJ
            </span>
            <span>Resident Job</span>
          </a>
          <nav aria-label="Employer navigation" className="employer-navigation" style={styles.nav}>
            {navigation.map((step) => (
              <a
                key={step.route}
                href={step.route}
                style={step.route === currentRoute ? styles.navLinkActive : styles.navLink}
                aria-current={step.route === currentRoute ? "page" : undefined}
              >
                <span style={styles.navPage}>Page {step.page}</span>
                <span>{step.title}</span>
              </a>
            ))}
          </nav>
          <div style={styles.sidebarNote}>
            <strong>
              {effectiveMode === "authenticated" ? "Secure boundary" : "Fixture mode"}
            </strong>
            <span>
              {effectiveMode === "authenticated"
                ? "Session and organization authority are verified before persisted data is shown."
                : "Visual workflow preview. Authoritative actions remain governed."}
            </span>
          </div>
        </aside>
        <div className="employer-workspace" style={styles.workspace}>
          <main id="employer-main-content" tabIndex={-1}>
            <header style={styles.header}>
              <div>
                <p style={styles.topbarEyebrow}>Employer workspace</p>
                <strong style={styles.topbarTitle}>
                  {effectiveMode === "authenticated"
                    ? "Secure employer workspace"
                    : "Sunrise of Oak Hill"}
                </strong>
              </div>
              {actions}
            </header>
            <section style={styles.hero}>
              <p style={styles.eyebrow}>{eyebrow}</p>
              <h1 style={styles.title}>{title}</h1>
              <p style={styles.lede}>{lede}</p>
            </section>
            <EmployerPageNavigator currentRoute={currentRoute} navigation={navigation} />
            {children}
          </main>
          <footer style={styles.footer}>
            <span>Resident Job Employer Journey</span>
            <nav aria-label="Employer footer navigation" style={styles.footerLinks}>
              <a href="/contact" style={styles.footerLink}>
                Support
              </a>
              <a href="/faq" style={styles.footerLink}>
                FAQ
              </a>
              <a href="/pricing" style={styles.footerLink}>
                Pricing
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </div>
  );
}

function EmployerPageNavigator({
  currentRoute,
  navigation
}: {
  currentRoute: string;
  navigation: readonly {
    boundary: string;
    page: string;
    route: string;
    status: string;
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
          <span aria-hidden="true">←</span> Back
        </a>
      ) : (
        <span aria-disabled="true" className="employer-page-arrow employer-page-arrow-disabled">
          <span aria-hidden="true">←</span> Back
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
          Next <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span aria-disabled="true" className="employer-page-arrow employer-page-arrow-disabled">
          Next <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}

export function WorkflowRoutes({ currentRoute }: { currentRoute: string }) {
  const navigation =
    process.env.RWOS_ENV === "production" ? persistedEmployerNavigation : employerNavigation;
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
