import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { InvoiceReviewPanel } from "../InvoiceReviewPanel";

export default function InvoiceDetailPage() {
  return (
    <EmployerShell
      currentRoute="/employer/invoices/detail"
      eyebrow="Invoice Detail"
      title="Review invoice detail without treating it as paid."
      lede="Invoice detail shows invoice state and payment state separately. Issued does not mean paid, and authorized does not mean settled."
      actions={<a href="/employer/invoices/breakdown" style={styles.primaryButton}>Charge breakdown</a>}
    >
      <InvoiceReviewPanel mode="detail" />
      <WorkflowRoutes currentRoute="/employer/invoices/detail" />
    </EmployerShell>
  );
}
