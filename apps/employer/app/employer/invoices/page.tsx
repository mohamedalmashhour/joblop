import { cookies } from "next/headers";
import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { InvoiceReviewPanel } from "./InvoiceReviewPanel";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../i18n/config";
import { dictionaries, type Messages } from "../../i18n/messages";

export default async function InvoicesPage() {
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
      <InvoiceReviewPanel mode="list" />
      <WorkflowRoutes currentRoute="/employer/invoices" />
    </EmployerShell>
  );
}
