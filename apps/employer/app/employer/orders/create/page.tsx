import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { OrderBuilderPanel } from "./OrderBuilderPanel";
import { serverLang } from "../../../i18n/serverLang";
import { pageHeaders } from "../../pageHeaderText";

export default async function CreateEmployerOrderPage() {
  const h = pageHeaders[await serverLang()].orderCreate;
  return (
    <EmployerShell
      currentRoute="/employer/orders/create"
      eyebrow={h.eyebrow}
      title={h.title}
      lede={h.lede}
      mode="authenticated"
      actions={
        <a href="/employer/orders" style={styles.secondaryButton}>
          {h.back}
        </a>
      }
    >
      <section style={styles.section}>
        <OrderBuilderPanel />
      </section>
    </EmployerShell>
  );
}
