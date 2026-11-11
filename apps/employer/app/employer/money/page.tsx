import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import { EmployerMoneyPanel } from "./EmployerMoneyPanel";
import { serverLang } from "../../i18n/serverLang";
import { pageHeaders } from "../pageHeaderText";

export default async function EmployerMoneyPage() {
  const h = pageHeaders[await serverLang()].money;
  return (
    <EmployerShell
      currentRoute="/employer/money"
      eyebrow={h.eyebrow}
      title={h.title}
      lede={h.lede}
      mode="authenticated"
      actions={
        <a href="/employer/invoices" style={styles.secondaryButton}>
          {h.invoices}
        </a>
      }
    >
      <section style={styles.section}>
        <EmployerMoneyPanel />
      </section>
      <WorkflowRoutes currentRoute="/employer/money" />
    </EmployerShell>
  );
}
