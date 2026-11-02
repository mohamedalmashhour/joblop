import type { CSSProperties } from "react";
import { phase01Routes, reviewChecks, reviewNotices } from "./phase01ReviewContent";

export default function Phase01ReviewPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Resident Workforce OS / Owner Review</p>
          <h1 style={styles.title}>Implementation Phase 01 Owner Review</h1>
          <p style={styles.lede}>
            Open every implemented administration page from one safe review index. These pages use
            governed static development fixtures and do not claim live backend integration,
            authoritative workflow execution, or production system health.
          </p>
        </div>
        <aside aria-label="Review scope" style={styles.contextPanel}>
          <strong>Scope: Pages 063-075</strong>
          <span>Status: implementation accepted</span>
          <span>Mode: owner visual review</span>
        </aside>
      </header>

      <section aria-labelledby="notice-title" style={styles.noticePanel}>
        <div>
          <p style={styles.eyebrowDark}>Truthfulness notice</p>
          <h2 id="notice-title" style={styles.sectionTitle}>
            This is a review index, not an operational console.
          </h2>
        </div>
        <ul style={styles.noticeList}>
          {reviewNotices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="route-grid-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="route-grid-title" style={styles.h2}>
            Route Navigation
          </h2>
          <span style={styles.statusBadge}>13 routes linked</span>
        </div>
        <div style={styles.routeGrid}>
          {phase01Routes.map((route) => (
            <a key={route.page} href={route.route} style={styles.routeCard}>
              <span style={styles.pageNumber}>Page {route.page}</span>
              <strong>{route.title}</strong>
              <span>{route.route}</span>
              <span style={styles.muted}>{route.ownership}</span>
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="inventory-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="inventory-title" style={styles.h2}>
            Route Inventory
          </h2>
          <span style={styles.statusBadge}>Build verified after validation</span>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th scope="col" style={styles.th}>Page</th>
                <th scope="col" style={styles.th}>Route</th>
                <th scope="col" style={styles.th}>Title</th>
                <th scope="col" style={styles.th}>Ownership</th>
                <th scope="col" style={styles.th}>Implementation</th>
                <th scope="col" style={styles.th}>Navigation</th>
              </tr>
            </thead>
            <tbody>
              {phase01Routes.map((route) => (
                <tr key={route.page}>
                  <td style={styles.td}>{route.page}</td>
                  <td style={styles.td}>{route.route}</td>
                  <td style={styles.td}>{route.title}</td>
                  <td style={styles.td}>{route.ownership}</td>
                  <td style={styles.td}>{route.status}</td>
                  <td style={styles.td}>{route.navigationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="checklist-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="checklist-title" style={styles.h2}>
            Owner Review Checklist
          </h2>
          <span style={styles.warningBadge}>Manual inspection</span>
        </div>
        <ol style={styles.checkList}>
          {reviewChecks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: "#000000",
    color: "#000000",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    padding: 24
  },
  header: {
    alignItems: "stretch",
    background: "#171511",
    borderRadius: 8,
    color: "white",
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 360px)",
    padding: 28
  },
  eyebrow: {
    color: "#fff8d8",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    color: "#f4efe4",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    fontSize: "clamp(34px, 5vw, 54px)",
    lineHeight: 1.02,
    margin: "8px 0"
  },
  lede: {
    color: "#faf6ec",
    fontSize: 16,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 860
  },
  contextPanel: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 16
  },
  noticePanel: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    display: "grid",
    gap: 16,
    marginTop: 18,
    padding: 18
  },
  sectionTitle: {
    color: "#f4efe4",
    fontSize: 24,
    lineHeight: 1.18,
    margin: "6px 0 0"
  },
  noticeList: {
    display: "grid",
    gap: 8,
    lineHeight: 1.45,
    margin: 0,
    paddingLeft: 20
  },
  panel: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    marginTop: 18,
    padding: 18
  },
  panelHeader: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14
  },
  h2: {
    color: "#f4efe4",
    fontSize: 21,
    margin: 0
  },
  statusBadge: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px"
  },
  warningBadge: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 8,
    color: "#8a5600",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px"
  },
  routeGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  routeCard: {
    background: "#f7faf9",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#000000",
    display: "grid",
    gap: 8,
    minHeight: 130,
    padding: 14,
    textDecoration: "none"
  },
  pageNumber: {
    color: "#f4efe4",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase"
  },
  muted: {
    color: "#f4efe4",
    fontSize: 13
  },
  tableWrap: {
    overflowX: "auto"
  },
  table: {
    borderCollapse: "collapse",
    minWidth: 900,
    width: "100%"
  },
  th: {
    background: "#f7faf9",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    fontSize: 13,
    padding: 10,
    textAlign: "left"
  },
  td: {
    border: "1px solid rgba(201, 162, 75, 0.16)",
    fontSize: 13,
    padding: 10,
    verticalAlign: "top"
  },
  checkList: {
    display: "grid",
    gap: 10,
    lineHeight: 1.5,
    margin: 0,
    paddingLeft: 20
  }
};
