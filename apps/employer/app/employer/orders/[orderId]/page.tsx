import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { OrderDetailPanel } from "./OrderDetailPanel";

export default async function EmployerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <EmployerShell
      currentRoute="/employer/orders"
      eyebrow="Orders / Detail"
      title="Order detail"
      lede="Review the order's role lines and status. You can submit a draft order for review or cancel the whole order; cancelling cascades to every role line."
      mode="authenticated"
      actions={
        <a href="/employer/orders" style={styles.secondaryButton}>
          Back to orders
        </a>
      }
    >
      <section style={styles.section}>
        <OrderDetailPanel orderId={orderId} />
      </section>
    </EmployerShell>
  );
}
