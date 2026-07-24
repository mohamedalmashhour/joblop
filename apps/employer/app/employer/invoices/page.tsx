import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { timesheetBoundaries, timesheetDataTruth } from "../timesheetWorkflowContent";
import { styles } from "../employerStyles";

export default function InvoiceHandoffPage() {
  return (
    <EmployerShell
      currentRoute="/employer/invoices"
      eyebrow="Page 050 - Invoice Handoff"
      title="Invoice review is the next workflow and is pending the invoice milestone."
      lede="This handoff prevents a dead end after timesheet approval. It does not issue invoices, authorize charges, settle payments, or create accounting records."
      actions={<a href="/employer/timesheets/approved" style={styles.secondaryButton}>Back to approved timesheet</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Next milestone boundary</p>
          <h2 style={styles.sectionTitle}>Timesheet approval ends at invoice handoff.</h2>
          <p style={styles.sectionCopy}>The next milestone will add invoice list, invoice detail, charge breakdown, and payment handoff.</p>
        </div>
        <div style={styles.cardGrid}>
          {[...timesheetBoundaries, ...timesheetDataTruth].map((item) => (
            <article key={item} style={styles.tintedCard}><p style={styles.cardText}>{item}</p></article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/invoices" />
    </EmployerShell>
  );
}
