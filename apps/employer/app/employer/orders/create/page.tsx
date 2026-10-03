import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { OrderBuilderPanel } from "./OrderBuilderPanel";

export default function CreateEmployerOrderPage() {
  return (
    <EmployerShell
      currentRoute="/employer/orders/create"
      eyebrow="Orders / New order"
      title="Create a multi-role staffing order."
      lede="Set the shared worksite and time window, then add a role line for each role you need. Submission sends every role for platform review; it does not publish a shift, assign a worker, or move money."
      mode="authenticated"
      actions={
        <a href="/employer/orders" style={styles.secondaryButton}>
          Back to orders
        </a>
      }
    >
      <section style={styles.section}>
        <OrderBuilderPanel />
      </section>
    </EmployerShell>
  );
}
