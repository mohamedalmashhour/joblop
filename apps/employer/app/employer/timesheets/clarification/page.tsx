import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { TimesheetReviewPanel } from "../TimesheetReviewPanel";

export default function TimesheetClarificationPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets/clarification"
      eyebrow="Page 049 - Clarification Requested"
      title="Request clarification without changing attendance evidence."
      lede="Clarification is a review state, not an accusation, payroll action, or silent correction."
      actions={<a href="/employer/timesheets/corrected" style={styles.primaryButton}>Corrected version</a>}
    >
      <TimesheetReviewPanel mode="clarification" />
      <WorkflowRoutes currentRoute="/employer/timesheets/clarification" />
    </EmployerShell>
  );
}
