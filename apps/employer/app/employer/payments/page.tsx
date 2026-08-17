import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import { PaymentStatePanel } from "./PaymentStatePanel";

export default function PaymentsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments"
      eyebrow="Payments"
      title="Review employer payment state without executing charges."
      lede="Payment state separates method, authorization, settlement, receipt, and exceptions. It does not choose a provider or move money."
      actions={<a href="/employer/payments/method" style={styles.primaryButton}>Payment method</a>}
    >
      <PaymentStatePanel mode="overview" />
      <WorkflowRoutes currentRoute="/employer/payments" />
    </EmployerShell>
  );
}
