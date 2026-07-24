import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { assignmentBoundaries } from "../assignmentWorkflowContent";
import { styles } from "../employerStyles";

export default function AttendanceHandoffPage() {
  return (
    <EmployerShell
      currentRoute="/employer/attendance"
      eyebrow="Page 048 - Attendance Handoff"
      title="Attendance is the next employer workflow and is not implemented in this milestone."
      lede="This handoff preserves the boundary after assignment detail. It does not track location, confirm check-in, approve attendance, approve timesheets, or calculate payroll."
      actions={<a href="/employer/assignments/detail" style={styles.secondaryButton}>Back to assignment detail</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Milestone boundary</p>
          <h2 style={styles.sectionTitle}>Stop here before attendance.</h2>
          <p style={styles.sectionCopy}>
            The applicant and assignment workflow is continuous through assignment detail, then hands off
            to attendance for a later milestone.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {assignmentBoundaries.map((boundary) => (
            <article key={boundary} style={styles.tintedCard}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/attendance" />
    </EmployerShell>
  );
}
