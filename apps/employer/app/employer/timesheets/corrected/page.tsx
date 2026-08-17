import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { TimesheetReviewPanel } from "../TimesheetReviewPanel";

export default function CorrectedTimesheetPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets/corrected"
      eyebrow="Corrected Timesheet"
      title="Review the corrected version with original values preserved."
      lede="Corrections keep original value, adjusted value, actor, timestamp, and reason visible."
      actions={<a href="/employer/timesheets/approved" style={styles.primaryButton}>Approved timesheet</a>}
    >
      <TimesheetReviewPanel mode="corrected" />
      <WorkflowRoutes currentRoute="/employer/timesheets/corrected" />
    </EmployerShell>
  );
}
