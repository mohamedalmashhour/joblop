import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { InvoiceReviewPanel } from "../InvoiceReviewPanel";
import { invoiceDetailHref, readInvoiceParam } from "../invoiceSelection";
import { serverLang } from "../../../i18n/serverLang";
import { pageHeaders } from "../../pageHeaderText";

export default async function ChargeBreakdownPage({
  searchParams
}: {
  searchParams: Promise<{ invoice?: string | string[] }>;
}) {
  const invoiceId = readInvoiceParam((await searchParams).invoice);
  const h = pageHeaders[await serverLang()].invoiceBreakdown;
  return (
    <EmployerShell
      currentRoute="/employer/invoices/breakdown"
      eyebrow={h.eyebrow}
      title={h.title}
      lede={h.lede}
      actions={
        <a href={invoiceId ? invoiceDetailHref(invoiceId) : "/employer/invoices"} style={styles.primaryButton}>
          {invoiceId ? h.backToInvoice : h.backToInvoices}
        </a>
      }
    >
      <InvoiceReviewPanel invoiceId={invoiceId} mode="breakdown" />
      <WorkflowRoutes currentRoute="/employer/invoices/breakdown" />
    </EmployerShell>
  );
}
