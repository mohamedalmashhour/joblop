import { EmployerShell, WorkflowRoutes } from "../EmployerShell";
import { paymentBoundaries, paymentDataTruth } from "../paymentWorkflowContent";
import { styles } from "../employerStyles";

export default function ReportsHandoffPage() {
  return (
    <EmployerShell
      currentRoute="/employer/reports"
      eyebrow="Page 052 - Reports Handoff"
      title="Employer reports are the next workflow and are pending the reports milestone."
      lede="This handoff prevents a dead end after payment exceptions. Reports will summarize source records and will not own operations or finance state."
      actions={<a href="/employer/payments/exceptions" style={styles.secondaryButton}>Back to payment exceptions</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Next milestone boundary</p>
          <h2 style={styles.sectionTitle}>Payment state ends at reports handoff.</h2>
          <p style={styles.sectionCopy}>The next milestone will add source-labelled summary metrics and links back to governing records.</p>
        </div>
        <div style={styles.cardGrid}>
          {[...paymentBoundaries, ...paymentDataTruth].map((item) => (
            <article key={item} style={styles.tintedCard}><p style={styles.cardText}>{item}</p></article>
          ))}
        </div>
      </section>
      <WorkflowRoutes currentRoute="/employer/reports" />
    </EmployerShell>
  );
}
