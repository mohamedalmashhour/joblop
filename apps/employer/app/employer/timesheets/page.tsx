import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import { TimesheetReviewPanel } from "./TimesheetReviewPanel";

export default function TimesheetsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets"
      eyebrow="Page 049 - Timesheets"
      title="Review draft timesheets from attendance evidence."
      lede="Timesheets distinguish scheduled, actual, original, adjusted, disputed, and approved values. They do not calculate payroll or execute payment."
      actions={<a href="/employer/timesheets/review" style={styles.primaryButton}>Employer review</a>}
    >
      <TimesheetReviewPanel mode="draft" />
      <WorkflowRoutes currentRoute="/employer/timesheets" />
    </EmployerShell>
  );
}
