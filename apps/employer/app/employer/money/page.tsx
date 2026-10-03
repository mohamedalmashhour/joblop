import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { styles } from "../employerStyles";
import { EmployerMoneyPanel } from "./EmployerMoneyPanel";

export default function EmployerMoneyPage() {
  return (
    <EmployerShell
      currentRoute="/employer/money"
      eyebrow="Money"
      title="Your money, in one place."
      lede="What you've been invoiced, what you've paid, and what's still outstanding — a summary that links to the full invoices and payment state. It does not move money."
      mode="authenticated"
      actions={
        <a href="/employer/invoices" style={styles.secondaryButton}>
          Invoices
        </a>
      }
    >
      <section style={styles.section}>
        <EmployerMoneyPanel />
      </section>
      <WorkflowRoutes currentRoute="/employer/money" />
    </EmployerShell>
  );
}
