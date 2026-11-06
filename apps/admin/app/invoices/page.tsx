import { InvoiceApprovalPanel } from "./InvoiceApprovalPanel";

export default function InvoiceApprovalPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Finance</p>
        <h1 style={styles.title}>Invoices</h1>
        <p style={styles.lede}>
          A locked timesheet creates a draft invoice. Approve it, then issue it to give it a number and make it
          official for the employer. No money moves here, and issuing cannot be undone from this screen.
        </p>
      </header>
      <InvoiceApprovalPanel />
    </main>
  );
}

const styles = {
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#000000", color: "#fff", padding: "48px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(38px, 5vw, 60px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18, lineHeight: 1.6, maxWidth: 820 }
} as const;
