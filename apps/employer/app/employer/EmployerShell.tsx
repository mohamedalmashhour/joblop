import type { ReactNode } from "react";
import { employerWorkflow } from "./employerJourneyContent";
import { styles } from "./employerStyles";
import { shiftWorkflow } from "./shifts/shiftManagementContent";

const employerNavigation = [...employerWorkflow, ...shiftWorkflow] as const;

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
      <header style={styles.header}>
        <a href="/" style={styles.brand} aria-label="Resident Job home">
          Resident Job
        </a>
        <nav aria-label="Employer navigation" style={styles.nav}>
          {employerNavigation.map((step) => (
            <a
              key={step.route}
              href={step.route}
              style={styles.navLink}
              aria-current={step.route === currentRoute ? "page" : undefined}
            >
              {step.title}
            </a>
          ))}
        </nav>
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
