import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { clientAssignmentVisibility } from "../clientCalendarContent";

export default async function ClientCalendarAssignmentPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const request = (await searchParams).request ?? null;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/assignment"
      eyebrow="Connected calendar / Assignment"
      title="Authorized assignment visibility"
      lede="The client sees coverage confirmation and the minimum worker identity required for this assignment. Private worker profile data remains hidden."
      mode={request ? "authenticated" : "fixture"}
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        {request ? <article style={styles.panel} aria-live="polite">
          <span style={styles.pill}>Persistence boundary</span>
          <h2 style={styles.sectionTitle}>Assignment visibility not connected</h2>
          <p style={styles.sectionCopy}>
            Request {request} is persisted, but no authorized assignment-read endpoint is part of
            this phase. No fixture worker is substituted for this request.
          </p>
          <div style={styles.tintedCard}>
            <p style={styles.cardText}>
              Attendance remains a handoff only. This screen cannot start attendance, timesheets,
              payroll, or payment execution.
            </p>
          </div>
        </article> : <article style={styles.panel}>
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
        </article>}
      </section>
    </EmployerShell>
  );
}
