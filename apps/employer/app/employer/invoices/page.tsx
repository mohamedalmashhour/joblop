import { cookies } from "next/headers";
import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { InvoiceReviewPanel } from "./InvoiceReviewPanel";
import { readInvoiceParam } from "./invoiceSelection";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../i18n/config";
import { dictionaries, type Messages } from "../../i18n/messages";

export default async function InvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ invoice?: string | string[]; pay?: string | string[] }>;
}) {
  const params = await searchParams;
  const pay = params.pay === "success" || params.pay === "cancel" ? params.pay : null;
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/invoices"
      eyebrow={m["page.invoicesEyebrow"]}
      title={m["page.invoicesTitle"]}
      lede={m["page.invoicesLede"]}
    >
      <InvoiceReviewPanel invoiceId={readInvoiceParam(params.invoice)} mode="list" paymentReturn={pay} />
      <WorkflowRoutes currentRoute="/employer/invoices" />
    </EmployerShell>
  );
}
