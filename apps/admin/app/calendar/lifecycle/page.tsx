import type { CSSProperties } from "react";
import { AdminLifecycleCalendarPanel } from "./AdminLifecycleCalendarPanel";

export default function AdminLifecycleCalendarPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <p style={styles.eyebrow}>Joblop / Administration</p>
        <h1 style={styles.title}>Lifecycle calendar</h1>
        <p style={styles.lede}>
          A month view of every non-draft request across organizations, placed on its shift date and
          coloured by status — from submission through to closure. Unlike the review calendar, which
          shows only the intake queue, this spans the whole lifecycle. Read only: opening a request
          does not approve, publish, assign, notify, or execute payment.
        </p>
      </header>

      <AdminLifecycleCalendarPanel />
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", padding: 24 },
  header: { background: "#171511", borderRadius: 8, color: "white", display: "grid", gap: 8, padding: 28 },
  eyebrow: { color: "#fff8d8", fontSize: 12, fontWeight: 900, margin: 0, textTransform: "uppercase" },
  title: { color: "#f4efe4", fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.02, margin: "4px 0" },
  lede: { color: "#faf6ec", fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 860 }
};
