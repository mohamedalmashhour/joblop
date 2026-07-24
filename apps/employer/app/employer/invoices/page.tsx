import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import { InvoiceReviewPanel } from "./InvoiceReviewPanel";

export default function InvoicesPage() {
  return (
    <EmployerShell
      currentRoute="/employer/invoices"
      eyebrow="Page 050 - Invoices"
      title="Review invoices generated from approved timesheet state."
      lede="Invoices are lifecycle records, not payment execution, settlement, payroll, accounting, or tax engines."
      actions={<a href="/employer/invoices/detail" style={styles.primaryButton}>Invoice detail</a>}
    >
      <InvoiceReviewPanel mode="list" />
      <WorkflowRoutes currentRoute="/employer/invoices" />
    </EmployerShell>
  );
}
