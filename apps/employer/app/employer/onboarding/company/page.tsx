import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import {
  companyBoundaries,
  companyIdentityLayers,
  organizationLifecycle
} from "../../employerJourneyContent";
import { styles } from "../../employerStyles";
import { OnboardingPanel } from "./OnboardingPanel";

export default function CompanyProfilePage() {
  return (
    <EmployerShell
      currentRoute="/employer/onboarding/company"
      eyebrow="Get started"
      title="Set up your organization, your first site, and a department — then create a staffing request."
      lede="This persists your organization inside your authenticated account. It does not run verification, billing, or payments."
    >
      <OnboardingPanel />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Identity layers</p>
          <h2 style={styles.sectionTitle}>Each layer has its own visibility and governance.</h2>
        </div>
        <div style={styles.cardGrid}>
          {companyIdentityLayers.map((layer) => (
            <article key={layer} style={styles.card}>
              <h3 style={styles.cardTitle}>{layer}</h3>
              <p style={styles.cardText}>Configured and reviewed under its own boundary.</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.twoColumn}>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Organization lifecycle</h3>
            <ol style={styles.stepList}>
              {organizationLifecycle.map((state) => (
                <li key={state} style={styles.stepItem}>
                  {state}
                </li>
              ))}
            </ol>
          </article>
          <article style={styles.tintedCard}>
            <h3 style={styles.cardTitle}>Boundary reminders</h3>
            <ol style={styles.stepList}>
              {companyBoundaries.map((boundary) => (
                <li key={boundary} style={styles.stepItem}>
                  {boundary}
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/onboarding/company" />
    </EmployerShell>
  );
}

