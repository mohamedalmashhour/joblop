import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { EmployerAssignmentsPanel } from "./EmployerAssignmentsPanel";

export default function EmployerAssignmentsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/assignments"
      eyebrow="Connected assignments / Client"
      title="See the confirmed assignments for your organization."
      lede="Authenticated, org-scoped assignment records connect directly to the platform — persisted data only, never fixture substitutes."
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.primaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Assignments</p>
          <h2 style={styles.sectionTitle}>Coverage stays truthful from confirmation to completion.</h2>
        </div>
        <EmployerAssignmentsPanel />
      </section>
    </EmployerShell>
  );
}
