import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { PaymentStatePanel } from "../PaymentStatePanel";

export default function PaymentExceptionsPage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments/exceptions"
      eyebrow="Page 051 - Payment Exceptions"
      title="Review payment exceptions without changing invoice or worker payable state."
      lede="Failures, retry eligibility, refunds, and disputes are displayed as states only. No retry or refund is executed here."
      actions={<a href="/employer/reports" style={styles.primaryButton}>Reports handoff</a>}
    >
      <PaymentStatePanel mode="exceptions" />
      <WorkflowRoutes currentRoute="/employer/payments/exceptions" />
    </EmployerShell>
  );
}
