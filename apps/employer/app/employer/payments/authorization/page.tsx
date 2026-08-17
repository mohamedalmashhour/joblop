import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { PaymentStatePanel } from "../PaymentStatePanel";

export default function AuthorizationStatePage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments/authorization"
      eyebrow="Authorization State"
      title="Review authorization state without claiming settlement."
      lede="Authorization pending or authorized does not mean funds are settled, refunded, or paid to workers."
      actions={<a href="/employer/payments/settlement" style={styles.primaryButton}>Settlement state</a>}
    >
      <PaymentStatePanel mode="authorization" />
      <WorkflowRoutes currentRoute="/employer/payments/authorization" />
    </EmployerShell>
  );
}
