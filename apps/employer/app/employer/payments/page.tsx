import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { invoiceBoundaries, invoiceDataTruth } from "../invoiceWorkflowContent";
import { styles } from "../employerStyles";

export default function PaymentHandoffPage() {
  return (
    <EmployerShell
      currentRoute="/employer/payments"
      eyebrow="Page 051 - Payment Handoff"
      title="Employer payment state is the next workflow and is pending the payment milestone."
      lede="This route prevents a dead end after charge breakdown. It does not authorize payment, settle funds, refund, or expose payment credentials."
      actions={<a href="/employer/invoices/breakdown" style={styles.secondaryButton}>Back to invoice breakdown</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Next milestone boundary</p>
          <h2 style={styles.sectionTitle}>Invoice review ends at payment-state handoff.</h2>
          <p style={styles.sectionCopy}>The next milestone will add method state, authorization state, settlement state, receipt state, and payment exceptions.</p>
        </div>
        <div style={styles.cardGrid}>
          {[...invoiceBoundaries, ...invoiceDataTruth].map((item) => (
            <article key={item} style={styles.tintedCard}><p style={styles.cardText}>{item}</p></article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/payments" />
    </EmployerShell>
  );
}
