import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import {
  companyBoundaries,
  companyIdentityLayers,
  organizationLifecycle
} from "../../employerJourneyContent";
import { styles } from "../../employerStyles";

export default function CompanyProfilePage() {
  return (
    <EmployerShell
      currentRoute="/employer/onboarding/company"
      eyebrow="Company Profile"
      title="Set up the organization without mixing public, legal, verified, and operational identity."
      lede="Company Profile owns organization identity visibility. It does not implement verification, billing, role management, tax, compliance adjudication, or legal approval."
      actions={
        <a href="/employer/onboarding/residences" style={styles.primaryButton}>
          Continue to residences
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Organization information</p>
          <h2 style={styles.sectionTitle}>Separate the identity layers before staffing begins.</h2>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            Public display name
            <input placeholder="Approved worker-facing name" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Legal organization name
            <input placeholder="Legal name placeholder" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Authorized representative
            <input placeholder="Representative placeholder" style={styles.input} />
          </label>
          <label style={styles.fieldLabel}>
            Primary operational contact
            <input placeholder="Scheduling or operations contact" style={styles.input} />
          </label>
        </div>
        <p style={styles.warning}>
          This is a development fixture surface. It does not verify legal identity, upload documents,
          store billing data, or change employer approval status.
        </p>
      </section>

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

