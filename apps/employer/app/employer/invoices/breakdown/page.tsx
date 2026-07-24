import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { InvoiceReviewPanel } from "../InvoiceReviewPanel";

export default function ChargeBreakdownPage() {
  return (
    <EmployerShell
      currentRoute="/employer/invoices/breakdown"
      eyebrow="Page 050 - Charge Breakdown"
      title="Review charge breakdown before payment-state handoff."
      lede="Charge breakdown explains fixture totals. It does not provide tax advice, post accounting, or execute charges."
      actions={<a href="/employer/payments" style={styles.primaryButton}>Payment handoff</a>}
    >
      <InvoiceReviewPanel mode="breakdown" />
      <WorkflowRoutes currentRoute="/employer/invoices/breakdown" />
    </EmployerShell>
  );
}
