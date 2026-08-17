import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import {
  aiRecommendationBoundaries,
  assignmentBoundaries
} from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";
import { AssignmentDraftPanel } from "../AssignmentDraftPanel";

export default function ManualAssignmentPage() {
  return (
    <EmployerShell
      currentRoute="/employer/assignments/manual"
      eyebrow="Manual Assignment"
      title="Select a candidate manually after human review."
      lede="Manual assignment is the human decision surface. It cannot bypass eligibility, waive qualifications, alter shift terms, or simulate worker acceptance."
      actions={<a href="/employer/applicants/compare" style={styles.secondaryButton}>Back to comparison</a>}
    >
      <AssignmentDraftPanel mode="manual" />

      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>AI and assignment boundary</p>
          <h2 style={styles.sectionTitle}>The employer makes the decision.</h2>
        </div>
        <div style={styles.cardGrid}>
          {[...aiRecommendationBoundaries, ...assignmentBoundaries.slice(0, 3)].map((boundary) => (
            <article key={boundary} style={styles.card}>
              <p style={styles.cardText}>{boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <WorkflowRoutes currentRoute="/employer/assignments/manual" />
    </EmployerShell>
  );
}
