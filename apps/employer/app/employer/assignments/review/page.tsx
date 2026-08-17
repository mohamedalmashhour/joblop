import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { assignmentBoundaries } from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";
import { AssignmentDraftPanel } from "../AssignmentDraftPanel";

export default function AssignmentReviewPage() {
  return (
    <EmployerShell
      currentRoute="/employer/assignments/review"
      eyebrow="Assignment Review"
      title="Review the human assignment decision before creating a pending response."
      lede="This review records the selected candidate and reason. It does not notify workers, guarantee acceptance, start attendance, or approve hours."
      actions={<a href="/employer/assignments/manual" style={styles.secondaryButton}>Back to manual selection</a>}
    >
      <AssignmentDraftPanel mode="review" />
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>
          {assignmentBoundaries.map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/assignments/review" />
    </EmployerShell>
  );
}
