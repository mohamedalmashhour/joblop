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

const employerNavigation = [...employerWorkflow, ...clientCalendarWorkflow, ...shiftWorkflow, ...assignmentWorkflow, ...attendanceWorkflow, ...timesheetWorkflow, ...invoiceWorkflow, ...paymentWorkflow] as const;

export function EmployerShell({
  actions,
  children,
  currentRoute,
  eyebrow,
  lede,
  title
}: {
  actions?: ReactNode;
  children: ReactNode;
  currentRoute: string;
  eyebrow: string;
  lede: string;
  title: string;
}) {
  return (
    <main style={styles.page}>
      <div style={styles.appFrame}>
        <aside className="employer-sidebar" style={styles.sidebarShell}>
          <a href="/" style={styles.brand} aria-label="Resident Job home">
            <span aria-hidden="true" style={styles.brandMark}>
              RJ
            </span>
            <span>Resident Job</span>
          </a>
          <nav
            aria-label="Employer navigation"
            className="employer-navigation"
            style={styles.nav}
          >
            {employerNavigation.map((step) => (
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
            <strong>Fixture mode</strong>
            <span>Visual workflow preview. Authoritative actions remain governed.</span>
          </div>
        </aside>
        <div className="employer-workspace" style={styles.workspace}>
          <header style={styles.header}>
            <div>
              <p style={styles.topbarEyebrow}>Employer workspace</p>
              <strong style={styles.topbarTitle}>Sunrise of Oak Hill</strong>
            </div>
            {actions}
          </header>
          <section style={styles.hero}>
            <p style={styles.eyebrow}>{eyebrow}</p>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.lede}>{lede}</p>
          </section>
          {children}
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
    </main>
  );
}

export function WorkflowRoutes({ currentRoute }: { currentRoute: string }) {
  return (
    <section aria-labelledby="workflow-title" style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Employer workflow</p>
        <h2 id="workflow-title" style={styles.sectionTitle}>
          Continue through the governed onboarding sequence.
        </h2>
      </div>
      <div style={styles.routeGrid}>
        {employerNavigation.map((step) => (
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
