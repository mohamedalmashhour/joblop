import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import {
  clientCalendarEvent,
  clientCalendarStatuses,
  clientRequestDetail
} from "../clientCalendarContent";

export default function ClientRequestDetailPage() {
  return (
    <EmployerShell
      currentRoute="/employer/calendar/request"
      eyebrow="Connected calendar / Request detail"
      title={`${clientCalendarEvent.roleLabel} request`}
      lede="Client-authorized request terms, readiness, and coverage status only. Worker compensation and platform economics are intentionally absent."
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.twoColumn}>
          <article style={styles.panel}>
            <p style={styles.eyebrowDark}>Current state</p>
            <h2 style={styles.sectionTitle}>Assigned</h2>
            <p style={styles.sectionCopy}>
              Assignment status is visible; private worker details remain restricted until explicitly
              authorized.
            </p>
            <div style={styles.pillGrid}>
              {clientCalendarStatuses.map((status) => (
                <span key={status} style={styles.pill}>
                  {status.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </article>
          <article style={styles.panel}>
            <h2 style={styles.cardTitle}>Request terms</h2>
            {Object.entries(clientRequestDetail).map(([label, value]) => (
              <div key={label} style={styles.tintedCard}>
                <strong>{label.replaceAll(/([A-Z])/g, " $1")}</strong>
                <p style={styles.cardText}>
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </p>
              </div>
            ))}
          </article>
        </div>
      </section>
    </EmployerShell>
  );
}
