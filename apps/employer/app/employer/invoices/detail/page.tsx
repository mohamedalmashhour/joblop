import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { InvoiceReviewPanel } from "../InvoiceReviewPanel";
import { invoiceBreakdownHref, readInvoiceParam } from "../invoiceSelection";

export default async function InvoiceDetailPage({
  searchParams
}: {
  searchParams: Promise<{ invoice?: string | string[] }>;
}) {
  const invoiceId = readInvoiceParam((await searchParams).invoice);
  return (
    <EmployerShell
      currentRoute="/employer/invoices/detail"
      eyebrow="Invoice Detail"
      title="Review invoice detail without treating it as paid."
      lede="Invoice detail shows invoice state and payment state separately. Issued does not mean paid, and authorized does not mean settled."
      actions={
        <>
          {invoiceId ? <a href={invoiceBreakdownHref(invoiceId)} style={styles.primaryButton}>Charge breakdown</a> : null}
          <a href="/employer/invoices" style={styles.secondaryButton}>Back to invoices</a>
        </>
      }
    >
      <InvoiceReviewPanel invoiceId={invoiceId} mode="detail" />
      <WorkflowRoutes currentRoute="/employer/invoices/detail" />
    </EmployerShell>
  );
}
