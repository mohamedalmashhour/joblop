import { styles } from "../../employerStyles";
import {
  clientCalendarEvent,
  clientCalendarStatuses,
  clientRequestDetail
} from "../clientCalendarContent";

export function FixtureClientRequestDetail() {
  return (
    <div style={styles.twoColumn}>
      <article style={styles.panel}>
        <p style={styles.eyebrowDark}>Fixture preview state</p>
        <h2 style={styles.sectionTitle}>Assigned</h2>
        <p style={styles.sectionCopy}>
          This non-persistent preview demonstrates assignment visibility. It is not an authenticated
          request record and does not claim backend success.
        </p>
        <div style={styles.pillGrid}>
          {clientCalendarStatuses.map((status) => (
            <span key={status} style={styles.pill}>
              {status.replaceAll("_", " ")}
            </span>
          ))}
        </div>
        <a href="/employer/calendar/assignment" style={styles.primaryButton}>
          View fixture assignment preview
        </a>
      </article>
      <article style={styles.panel}>
        <p style={styles.eyebrowDark}>Fixture request</p>
        <h2 style={styles.cardTitle}>{clientCalendarEvent.roleLabel} request terms</h2>
        {Object.entries(clientRequestDetail).map(([label, value]) => (
          <div key={label} style={styles.tintedCard}>
            <strong>{label.replaceAll(/([A-Z])/g, " $1")}</strong>
            <p style={styles.cardText}>{Array.isArray(value) ? value.join(", ") : String(value)}</p>
          </div>
        ))}
      </article>
    </div>
  );
}
