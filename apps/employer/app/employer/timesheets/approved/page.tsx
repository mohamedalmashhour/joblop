import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { TimesheetReviewPanel } from "../TimesheetReviewPanel";

export default function ApprovedTimesheetPage() {
  return (
    <EmployerShell
      currentRoute="/employer/timesheets/approved"
      eyebrow="Page 049 - Approved Timesheet"
      title="Approved timesheet is finance-ready, not payroll paid."
      lede="Approval prepares the invoice handoff. It does not calculate payroll, execute worker payment, or claim invoice issuance."
      actions={<a href="/employer/invoices" style={styles.primaryButton}>Invoice handoff</a>}
    >
      <TimesheetReviewPanel mode="approved" />
      <WorkflowRoutes currentRoute="/employer/timesheets/approved" />
    </EmployerShell>
  );
}
