import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { OrdersListPanel } from "./OrdersListPanel";
import { serverLang } from "../../i18n/serverLang";
import { pageHeaders } from "../pageHeaderText";

export default async function EmployerOrdersPage() {
  const h = pageHeaders[await serverLang()].orders;
  return (
    <EmployerShell
      currentRoute="/employer/orders"
      eyebrow={h.eyebrow}
      title={h.title}
      lede={h.lede}
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          {h.back}
        </a>
      }
    >
      <section style={styles.section}>
        <OrdersListPanel />
      </section>
    </EmployerShell>
  );
}
