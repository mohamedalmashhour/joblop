import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { EmployerAttendancePanel } from "./EmployerAttendancePanel";

export default function EmployerAttendancePage() {
  return (
    <EmployerShell
      currentRoute="/employer/attendance"
      eyebrow="Connected attendance / Client"
      title="See the attendance for your organization's confirmed shifts."
      lede="Authenticated, org-scoped attendance records connect directly to the platform — persisted data only, never fixture substitutes."
      mode="authenticated"
      actions={
        <a href="/employer/assignments" style={styles.primaryButton}>
          Back to assignments
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Attendance</p>
          <h2 style={styles.sectionTitle}>Presence stays truthful from check-in to completion.</h2>
        </div>
        <EmployerAttendancePanel />
      </section>
    </EmployerShell>
  );
}
