import { EmployerPlanOrdersPanel, JobListingOrdersPanel } from "./EmployerPlanOrdersPanel";

export default function EmployerPlanOrdersPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Administration</p>
        <h1 style={styles.title}>Employer plan orders</h1>
        <p style={styles.lede}>
          Review and confirm employer fees paid by Interac e-transfer: short-term plans (Shift Pro, Shift
          Business) and long-term job listings (C$99/month paid in advance, first month 50% off). Amounts
          include GST + QST. Confirm an order only after verifying the e-transfer arrived at
          billing@joblop.com for the total shown (the reference matches the order id). Confirming a plan
          starts it for one month; confirming a listing publishes that long-term job to workers for one
          more month.
        </p>
      </header>
      <EmployerPlanOrdersPanel />
      <JobListingOrdersPanel />
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 17, lineHeight: 1.6, maxWidth: 860 }
} as const;
