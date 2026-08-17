import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { assignmentBoundaries } from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";
import { AssignmentDraftPanel } from "../AssignmentDraftPanel";

export default function AssignmentConfirmationPage() {
  return (
    <EmployerShell
      currentRoute="/employer/assignments/confirmation"
      eyebrow="Assignment Confirmation"
      title="Confirm that an assignment fixture was created for worker response."
      lede="This state is informational. It does not claim real notification delivery, worker acceptance, attendance, payroll, or payment."
      actions={<a href="/employer/assignments/worker-response" style={styles.primaryButton}>Worker response state</a>}
    >
      <AssignmentDraftPanel mode="confirmation" />
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>
          {assignmentBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/assignments/confirmation" />
    </EmployerShell>
  );
}
