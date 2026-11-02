import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { OrdersListPanel } from "./OrdersListPanel";

export default function EmployerOrdersPage() {
  return (
    <EmployerShell
      currentRoute="/employer/orders"
      eyebrow="Orders"
      title="Staffing orders"
      lede="One order can staff several roles at once. Each role is reviewed and priced by Joblop on its own."
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <OrdersListPanel />
      </section>
    </EmployerShell>
  );
}
