import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import {
  residenceBoundaries,
  residenceLifecycle
} from "../../employerJourneyContent";
import { styles } from "../../employerStyles";
import { EmployerResidencesPanel } from "./EmployerResidencesPanel";

export default function ResidencesPage() {
  return (
    <EmployerShell
      currentRoute="/employer/onboarding/residences"
      eyebrow="Page 039 - Residences"
      title="Create governed residence records without absorbing department or clinical data."
      lede="Residences are operating sites inside an organization. They are not departments, patient records, clinical records, or staffing engines."
      actions={
        <a href="/employer/onboarding/departments" style={styles.primaryButton}>
          Continue to departments
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Residence records</p>
          <h2 style={styles.sectionTitle}>Your organization&rsquo;s authoritative residences.</h2>
        </div>
        <EmployerResidencesPanel />
      </section>

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Independent residence lifecycles</p>
          <h2 style={styles.sectionTitle}>One active label cannot explain every state.</h2>
        </div>
        <div style={styles.cardGrid}>
          {residenceLifecycle.map((lifecycle) => (
            <article key={lifecycle} style={styles.card}>
              <p style={styles.cardText}>{lifecycle}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Privacy and access</p>
          <h2 style={styles.sectionTitle}>Worker-facing information remains minimum necessary.</h2>
        </div>
        <div style={styles.cardGrid}>
          {residenceBoundaries.map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/onboarding/residences" />
    </EmployerShell>
  );
}

