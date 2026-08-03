import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { assignmentBoundaries } from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";
import { AssignmentDraftPanel } from "../AssignmentDraftPanel";

export default function AssignmentDetailPage() {
  return (
    <EmployerShell
      currentRoute="/employer/assignments/detail"
      eyebrow="Page 046 - Assignment Detail"
      title="Review assignment state before the attendance handoff."
      lede="Assignment detail summarizes the assignment and response state. Attendance, timesheets, invoices, and payment presentation remain separate governed workflows; no payroll or payment execution occurs here."
      actions={
        <a href="/employer/attendance" style={styles.primaryButton}>
          Attendance handoff
        </a>
      }
    >
      <AssignmentDraftPanel mode="detail" />
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>
          {assignmentBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/assignments/detail" />
    </EmployerShell>
  );
}
