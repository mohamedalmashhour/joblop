import { cookies } from "next/headers";
import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import { PaymentStatePanel } from "./PaymentStatePanel";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../i18n/config";
import { dictionaries, type Messages } from "../../i18n/messages";

export default async function PaymentsPage() {
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/payments"
      eyebrow={m["page.paymentsEyebrow"]}
      title={m["page.paymentsTitle"]}
      lede={m["page.paymentsLede"]}
      // The payment-method page is not open on the live site; invoices is where employers pay.
      actions={<a href="/employer/invoices" style={styles.primaryButton}>{m["shell.nav.invoices"]}</a>}
    >
      <PaymentStatePanel mode="overview" />
      <WorkflowRoutes currentRoute="/employer/payments" />
    </EmployerShell>
  );
}
