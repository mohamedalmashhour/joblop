import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { OrderDetailPanel } from "./OrderDetailPanel";
import { serverLang } from "../../../i18n/serverLang";
import { pageHeaders } from "../../pageHeaderText";

export default async function EmployerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const h = pageHeaders[await serverLang()].orderDetail;
  return (
    <EmployerShell
      currentRoute="/employer/orders"
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
        <OrderDetailPanel orderId={orderId} />
      </section>
    </EmployerShell>
  );
}
