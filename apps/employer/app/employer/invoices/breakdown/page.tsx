import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { InvoiceReviewPanel } from "../InvoiceReviewPanel";
import { invoiceDetailHref, readInvoiceParam } from "../invoiceSelection";

export default async function ChargeBreakdownPage({
  searchParams
}: {
  searchParams: Promise<{ invoice?: string | string[] }>;
}) {
  const invoiceId = readInvoiceParam((await searchParams).invoice);
  return (
    <EmployerShell
      currentRoute="/employer/invoices/breakdown"
      eyebrow="Charge Breakdown"
      title="Review charge breakdown before payment-state handoff."
      lede="Charge breakdown explains invoice totals. It does not provide tax advice, post accounting, or execute charges."
      actions={
        <a href={invoiceId ? invoiceDetailHref(invoiceId) : "/employer/invoices"} style={styles.primaryButton}>
          {invoiceId ? "Back to invoice" : "Back to invoices"}
        </a>
      }
    >
      <InvoiceReviewPanel invoiceId={invoiceId} mode="breakdown" />
      <WorkflowRoutes currentRoute="/employer/invoices/breakdown" />
    </EmployerShell>
  );
}
