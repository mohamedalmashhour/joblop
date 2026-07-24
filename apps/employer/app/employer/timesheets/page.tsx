import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { attendanceBoundaries, attendanceDataTruth } from "../attendanceWorkflowContent";
import { styles } from "../employerStyles";

export default function TimesheetHandoffPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets"
      eyebrow="Page 049 - Timesheet Handoff"
      title="Timesheet review is the next workflow and remains pending this milestone."
      lede="This route prevents a dead end after attendance exception review. It does not approve hours, adjust timesheets, calculate payroll, invoice, or pay workers."
      actions={<a href="/employer/attendance/exceptions" style={styles.secondaryButton}>Back to exceptions</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Next milestone boundary</p>
          <h2 style={styles.sectionTitle}>Attendance monitoring ends at timesheet handoff.</h2>
          <p style={styles.sectionCopy}>
            The next milestone will implement draft timesheet review, adjustments, clarification,
            approval, and invoice handoff.
          </p>
        </div>
        <div style={styles.cardGrid}>
          {[...attendanceBoundaries, ...attendanceDataTruth].map((item) => (
            <article key={item} style={styles.tintedCard}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/timesheets" />
    </EmployerShell>
  );
}
