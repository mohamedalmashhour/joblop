import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { manualAssignmentLifecycle } from "../../assignmentWorkflowContent";
import { styles } from "../../employerStyles";
import { AssignmentDraftPanel } from "../AssignmentDraftPanel";

export default function WorkerResponseStatePage() {
  return (
    <EmployerShell
      currentRoute="/employer/assignments/worker-response"
      eyebrow="Page 046 - Worker Response State"
      title="Track truthful assignment response states without simulating acceptance."
      lede="The system can show proposed, pending, accepted, declined, expired, or cancelled states. This milestone stops at pending response and does not act as the worker."
      actions={<a href="/employer/assignments/detail" style={styles.primaryButton}>Assignment detail</a>}
    >
      <AssignmentDraftPanel mode="response" />
      <section style={styles.whiteSection}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Response states</p>
          <h2 style={styles.sectionTitle}>States remain independent.</h2>
        </div>
        <div style={styles.pillGrid}>
          {manualAssignmentLifecycle.map((state) => <span key={state} style={styles.pill}>{state}</span>)}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/assignments/worker-response" />
    </EmployerShell>
  );
}
