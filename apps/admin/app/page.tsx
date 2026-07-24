import { adminRoles } from "@rwos/auth";
import type { CSSProperties } from "react";

const kpis = [
  ["Residences", "16", "6 need attention"],
  ["Open shifts", "38", "3 emergency"],
  ["Workers online", "42", "12 within 10 km"],
  ["Pending approvals", "9", "Dispatch cannot bypass"]
] as const;

const aiMatches = [
  ["Chef emergency", "Mohamed A.", "95%", "Worked there 13x, can work alone, Rational oven"],
  ["Night care", "Sarah L.", "88%", "Credential verified, available now, 8 km"],
  ["Kitchen aide", "John D.", "82%", "Worked food service, needs supervisor on site"]
] as const;

const workerPool = [
  ["Kitchen", "18 workers", "7 emergency ready"],
  ["Care", "34 workers", "11 tonight"],
  ["Housekeeping", "22 workers", "9 tomorrow"],
  ["Maintenance", "8 workers", "2 on call"]
] as const;

const dispatchGroups = [
  ["Kitchen", "4 requests", "18 workers", "Chef-alone jobs require professional approval"],
  ["Care / Nurse", "6 requests", "34 workers", "Credential and supervisor checks required"],
  ["Helper", "3 requests", "22 workers", "Dining, housekeeping, floor-service support"],
  ["Maintenance", "1 request", "8 workers", "Safety and building access must be confirmed"]
] as const;

const requests = [
  ["Laval Residence", "Chef", "Emergency", "Approve worker offer"],
  ["Golden Gardens", "PSW", "Night", "Review credentials"],
  ["Sunrise Residence", "Dishwasher", "Urgent", "Search expanded"],
  ["Greenwood", "Housekeeping", "Tomorrow", "Confirmed"]
] as const;

const adminAvailableOrdersCalendar = [
  ["Now", "14", "Open worker requests", "Open"],
  ["Emergency", "3", "Needs dispatch decision", "Emergency"],
  ["Today", "21", "Available shifts", "Open"],
  ["Tomorrow", "17", "Future demand", "Open"]
] as const;

const adminOrderCalendar = [
  ["Past", "126", "Completed orders", "Completed"],
  ["Today", "38", "Active orders", "Confirmed"],
  ["Future", "54", "Scheduled orders", "Scheduled"],
  ["Blocked", "5", "Needs human approval", "Pending"]
] as const;

const adminRevenueCalendar = [
  ["Today", "$8,750", "Client billing", "Money"],
  ["Worker pay", "$5,120", "Separate ledger", "Money"],
  ["Travel", "$430", "Allowance line", "Pending"],
  ["Margin", "$3,200", "Platform estimate", "Money"]
] as const;

export default function AdminHome() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Admin / Dispatch OS</p>
          <h1 style={styles.title}>Enterprise Dispatch Center</h1>
          <p style={styles.copy}>
            Central view for client requests, worker matching, calendars, approvals and audit.
            Demo data only. AI recommends; dispatchers approve.
          </p>
        </div>
        <div style={styles.roleBox}>
          <strong>Role shells</strong>
          <span>{adminRoles.join(", ")}</span>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        {kpis.map(([label, value, note]) => (
          <article key={label} style={styles.card}>
            <p style={styles.small}>{label}</p>
            <strong style={styles.big}>{value}</strong>
            <p style={styles.small}>{note}</p>
          </article>
        ))}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.h2}>Dispatch by Staff Group</h2>
          <span style={styles.badge}>Same operating model</span>
        </div>
        <p style={styles.small}>
          Admin sees the same groups as the worker and client apps, then approves the right worker
          match for each operational need.
        </p>
        <div style={styles.groupBoard}>
          {dispatchGroups.map(([group, demand, workers, rule]) => (
            <div key={group} style={styles.groupCell}>
              <strong style={styles.groupTitle}>{group}</strong>
              <span style={styles.groupCount}>{demand}</span>
              <span>{workers}</span>
              <p style={styles.small}>{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.h2}>AI Matching Queue</h2>
            <span style={styles.badge}>Advisor only</span>
          </div>
          {aiMatches.map(([job, worker, score, evidence]) => (
            <div key={`${job}-${worker}`} style={styles.matchCard}>
              <div>
                <strong>{job}</strong>
                <p style={styles.small}>{worker}</p>
                <p style={styles.small}>{evidence}</p>
              </div>
              <div style={styles.scoreBox}>
                <strong>{score}</strong>
                <button style={styles.actionButton}>Approve</button>
              </div>
            </div>
          ))}
        </article>

        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.h2}>Worker Pool</h2>
            <span style={styles.badge}>Availability</span>
          </div>
          {workerPool.map(([category, count, ready]) => (
            <div key={category} style={styles.poolRow}>
              <strong>{category}</strong>
              <span>{count}</span>
              <span style={styles.status}>{ready}</span>
            </div>
          ))}
        </article>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.h2}>Client Requests and Dispatch Calendar</h2>
          <span style={styles.badge}>Human decision required</span>
        </div>
        {requests.map(([residence, role, urgency, next]) => (
          <div key={`${residence}-${role}`} style={styles.requestRow}>
            <strong>{residence}</strong>
            <span>{role}</span>
            <span style={urgency === "Emergency" ? styles.danger : styles.status}>{urgency}</span>
            <span>{next}</span>
          </div>
        ))}
      </section>

      <CalendarSection
        badge="Dispatch queue"
        items={adminAvailableOrdersCalendar}
        title="Available Orders Calendar"
      />
      <CalendarSection
        badge="Operations history"
        items={adminOrderCalendar}
        title="Past & Future Orders Calendar"
      />
      <CalendarSection badge="Finance view" items={adminRevenueCalendar} title="Revenue Calendar" />

      <section style={styles.audit}>
        <strong>Audit posture</strong>
        <span>Every approval, rejection, worker offer, client request and dispatch decision is recorded.</span>
      </section>
    </main>
  );
}

function CalendarSection({
  badge,
  items,
  title
}: {
  badge: string;
  items: readonly (readonly [string, string, string, string])[];
  title: string;
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.h2}>{title}</h2>
        <span style={styles.badge}>{badge}</span>
      </div>
      <div style={styles.calendarBoard}>
        {items.map(([day, value, detail, status]) => (
          <a
            aria-label={`${title}: open ${day} ${status}`}
            href={getAdminCalendarHref(title, status)}
            key={`${title}-${day}-${value}`}
            style={
              status === "Emergency"
                ? styles.calendarHot
                : status === "Money"
                  ? styles.calendarMoney
                  : styles.calendarCell
            }
          >
            <strong style={styles.time}>{day}</strong>
            <strong style={styles.calendarValue}>{value}</strong>
            <span>{detail}</span>
            <span style={status === "Emergency" ? styles.danger : styles.status}>{status}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function getAdminCalendarHref(title: string, status: string) {
  if (title === "Revenue Calendar" || status === "Money") {
    return "/finance";
  }

  if (status === "Emergency" || status === "Pending") {
    return "/ai-control-center";
  }

  if (title === "Past & Future Orders Calendar") {
    return "/shifts";
  }

  return "/shifts";
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: "#eef3f8",
    color: "#0b1f3a",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    padding: 24
  },
  hero: {
    alignItems: "center",
    background: "#071f4d",
    borderRadius: 18,
    color: "white",
    display: "flex",
    gap: 24,
    justifyContent: "space-between",
    padding: 28
  },
  eyebrow: { color: "#fff8d8", fontSize: 12, fontWeight: 800, letterSpacing: 0, margin: 0 },
  title: { fontSize: 36, letterSpacing: 0, margin: "6px 0" },
  copy: { color: "#dce8e8", lineHeight: 1.5, margin: 0, maxWidth: 760 },
  roleBox: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: 12,
    display: "grid",
    gap: 6,
    minWidth: 220,
    padding: 16
  },
  kpiGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginTop: 18
  },
  card: { background: "white", border: "1px solid #dce8e8", borderRadius: 10, padding: 18 },
  small: { color: "#607276", fontSize: 13, margin: "4px 0" },
  big: { display: "block", fontSize: 30, margin: "6px 0" },
  grid: { display: "grid", gap: 18, gridTemplateColumns: "1.35fr 0.65fr", marginTop: 18 },
  panel: { background: "white", border: "1px solid #dce8e8", borderRadius: 12, marginTop: 18, padding: 18 },
  panelHeader: { alignItems: "center", display: "flex", justifyContent: "space-between" },
  h2: { fontSize: 20, margin: 0 },
  badge: {
    background: "#fff8d8",
    border: "1px solid #e8d782",
    borderRadius: 999,
    color: "#071f4d",
    fontSize: 12,
    fontWeight: 800,
    padding: "6px 10px"
  },
  matchCard: {
    alignItems: "center",
    borderTop: "1px solid #e7eeee",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    padding: "16px 0"
  },
  scoreBox: { alignItems: "end", display: "grid", gap: 8 },
  actionButton: {
    background: "#071f4d",
    border: 0,
    borderRadius: 8,
    color: "white",
    fontWeight: 800,
    minHeight: 40,
    padding: "0 14px"
  },
  poolRow: {
    borderTop: "1px solid #e7eeee",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "1fr auto",
    padding: "14px 0"
  },
  groupBoard: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    marginTop: 14
  },
  groupCell: {
    background: "#f8fbfb",
    border: "1px solid #dce8e8",
    borderRadius: 10,
    display: "grid",
    gap: 8,
    minHeight: 152,
    padding: 14
  },
  groupTitle: {
    color: "#071f4d",
    fontSize: 17
  },
  groupCount: {
    color: "#b66b00",
    fontSize: 22,
    fontWeight: 900
  },
  status: { color: "#1f6f55", fontSize: 13, fontWeight: 800 },
  danger: { color: "#c93434", fontSize: 13, fontWeight: 900 },
  requestRow: {
    borderTop: "1px solid #e7eeee",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1.2fr 0.8fr 0.7fr 1fr",
    padding: "14px 0"
  },
  calendarBoard: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    marginTop: 14
  },
  calendarCell: {
    background: "#f8fbfb",
    border: "1px solid #dce8e8",
    borderRadius: 10,
    color: "#0b1f3a",
    display: "grid",
    gap: 8,
    minHeight: 132,
    padding: 14,
    textDecoration: "none"
  },
  calendarHot: {
    background: "#fff4f4",
    border: "1px solid #e5a4a4",
    borderRadius: 10,
    color: "#0b1f3a",
    display: "grid",
    gap: 8,
    minHeight: 132,
    padding: 14,
    textDecoration: "none"
  },
  calendarMoney: {
    background: "#f0fff8",
    border: "1px solid #9fd8bc",
    borderRadius: 10,
    color: "#0b1f3a",
    display: "grid",
    gap: 8,
    minHeight: 132,
    padding: 14,
    textDecoration: "none"
  },
  calendarValue: {
    color: "#071f4d",
    fontSize: 28,
    fontWeight: 900
  },
  time: { color: "#123b78" },
  audit: {
    background: "#071f4d",
    borderRadius: 12,
    color: "white",
    display: "flex",
    gap: 12,
    marginTop: 18,
    padding: 18
  }
};
