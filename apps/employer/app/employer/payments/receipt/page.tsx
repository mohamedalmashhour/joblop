import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { PaymentStatePanel } from "../PaymentStatePanel";

export default function ReceiptStatePage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments/receipt"
      eyebrow="Receipt State"
      title="Display receipt reference without provider proof."
      lede="Receipt state is fixture-backed. It is not provider proof, accounting posting, worker payout, or tax receipt."
      actions={<a href="/employer/payments/exceptions" style={styles.primaryButton}>Payment exceptions</a>}
    >
      <PaymentStatePanel mode="receipt" />
      <WorkflowRoutes currentRoute="/employer/payments/receipt" />
    </EmployerShell>
  );
}
