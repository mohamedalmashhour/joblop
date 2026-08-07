import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { EmployerTimesheetsPanel } from "./EmployerTimesheetsPanel";

export default function EmployerTimesheetsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets"
      eyebrow="Connected timesheets / Client"
      title="Review the timesheets for your organization's completed shifts."
      lede="Authenticated, org-scoped timesheet records connect directly to the platform — persisted data only, never fixture substitutes."
      mode="authenticated"
      actions={
        <a href="/employer/attendance" style={styles.primaryButton}>
          Back to attendance
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Timesheets</p>
          <h2 style={styles.sectionTitle}>Payable hours stay truthful from review to approval.</h2>
        </div>
        <EmployerTimesheetsPanel />
      </section>
    </EmployerShell>
  );
}
