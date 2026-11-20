import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { InvoiceReviewPanel } from "../InvoiceReviewPanel";
import { invoiceBreakdownHref, readInvoiceParam } from "../invoiceSelection";
import { serverLang } from "../../../i18n/serverLang";
import { pageHeaders } from "../../pageHeaderText";

export default async function InvoiceDetailPage({
  searchParams
}: {
  searchParams: Promise<{ invoice?: string | string[] }>;
}) {
  const invoiceId = readInvoiceParam((await searchParams).invoice);
  const h = pageHeaders[await serverLang()].invoiceDetail;
  return (
    <EmployerShell
      currentRoute="/employer/invoices/detail"
      eyebrow={h.eyebrow}
      title={h.title}
      lede={h.lede}
      actions={
        <>
          {invoiceId ? <a href={invoiceBreakdownHref(invoiceId)} style={styles.primaryButton}>{h.breakdown}</a> : null}
          <a href="/employer/invoices" style={styles.secondaryButton}>{h.back}</a>
        </>
      }
    >
      <InvoiceReviewPanel invoiceId={invoiceId} mode="detail" />
      <WorkflowRoutes currentRoute="/employer/invoices/detail" />
    </EmployerShell>
  );
}
