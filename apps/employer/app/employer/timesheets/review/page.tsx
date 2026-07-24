import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { TimesheetReviewPanel } from "../TimesheetReviewPanel";

export default function TimesheetReviewPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets/review"
      eyebrow="Page 049 - Timesheet Review"
      title="Review original and adjusted time before any approval."
      lede="Employer approval must be deliberate. Fixture-backed review does not claim server persistence."
      actions={<a href="/employer/timesheets" style={styles.secondaryButton}>Back to draft</a>}
    >
      <TimesheetReviewPanel mode="review" />
      <WorkflowRoutes currentRoute="/employer/timesheets/review" />
    </EmployerShell>
  );
}
