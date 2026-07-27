import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { clientAssignmentVisibility } from "../clientCalendarContent";

export default function ClientCalendarAssignmentPage() {
  return (
    <EmployerShell
      currentRoute="/employer/calendar/assignment"
      eyebrow="Connected calendar / Assignment"
      title="Authorized assignment visibility"
      lede="The client sees coverage confirmation and the minimum worker identity required for this assignment. Private worker profile data remains hidden."
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <article style={styles.panel}>
          <span style={styles.pill}>{clientAssignmentVisibility.status}</span>
          <h2 style={styles.sectionTitle}>{clientAssignmentVisibility.assignedWorker.displayName}</h2>
          <p style={styles.sectionCopy}>
            {clientAssignmentVisibility.assignedWorker.roleLabel}
          </p>
          <div style={styles.tintedCard}>
            <p style={styles.cardText}>
              Assignment authorization is confirmed. Contact, address, identity-document,
              availability, compensation, and unrelated profile details are not client-visible.
            </p>
          </div>
        </article>
      </section>
    </EmployerShell>
  );
}
