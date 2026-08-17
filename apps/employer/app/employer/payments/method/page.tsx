import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { PaymentStatePanel } from "../PaymentStatePanel";

export default function PaymentMethodPage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments/method"
      eyebrow="Payment Method State"
      title="Show masked payment method state without storing credentials here."
      lede="Full payment credentials are never exposed. Method state is fixture-backed and integration-pending."
      actions={<a href="/employer/payments/authorization" style={styles.primaryButton}>Authorization state</a>}
    >
      <PaymentStatePanel mode="method" />
      <WorkflowRoutes currentRoute="/employer/payments/method" />
    </EmployerShell>
  );
}
