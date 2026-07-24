import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { publishedShiftRows, shiftBoundaries } from "../shiftManagementContent";
import { styles } from "../../employerStyles";

export default function PublishedShiftPage() {
  return (
    <EmployerShell
      currentRoute="/employer/shifts/published"
      eyebrow="Published Shift"
      title="Review published shift states without confusing publication, filling, assignment, or attendance."
      lede="This route is a governed published-shift view. It does not assign workers, approve applications, confirm attendance, or calculate finance."
      actions={<a href="/employer/shifts/ai-suggestions" style={styles.primaryButton}>AI suggestions</a>}
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.eyebrowDark}>Published shifts</p><h2 style={styles.sectionTitle}>Every row labels its state and boundary.</h2></div>
        <div style={styles.cardGrid}>{publishedShiftRows.map((row) => <article key={row.title} style={styles.card}><h3 style={styles.cardTitle}>{row.title}</h3><p style={styles.cardText}>State: {row.state}</p><p style={styles.cardText}>Staffing: {row.staffing}</p><p style={styles.cardText}>{row.boundary}</p><a href="/employer/shifts/detail" style={{ ...styles.secondaryButton, marginTop: 12 }}>Open detail</a></article>)}</div>
      </section>
      <section style={styles.whiteSection}>
        <div style={styles.cardGrid}>{shiftBoundaries.map((boundary) => <article key={boundary} style={styles.tintedCard}><p style={styles.cardText}>{boundary}</p></article>)}</div>
      </section>
      <WorkflowRoutes currentRoute="/employer/shifts/published" />
    </EmployerShell>
  );
}
