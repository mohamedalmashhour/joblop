import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { PaymentStatePanel } from "../PaymentStatePanel";

export default function SettlementStatePage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments/settlement"
      eyebrow="Settlement State"
      title="Review settlement state without simulating money movement."
      lede="Settlement state is a fixture display. No provider settlement, refund, chargeback, or worker payable is executed."
      actions={<a href="/employer/payments/receipt" style={styles.primaryButton}>Receipt state</a>}
    >
      <PaymentStatePanel mode="settlement" />
      <WorkflowRoutes currentRoute="/employer/payments/settlement" />
    </EmployerShell>
  );
}
