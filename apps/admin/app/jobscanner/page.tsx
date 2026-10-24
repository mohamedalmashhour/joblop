import { JobScannerPanel } from "./JobScannerPanel";

export default function JobScannerPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Resident Workforce OS / JobScanner</p>
        <h1 style={styles.title}>JobScanner</h1>
        <p style={styles.lede}>
          Aggregated external jobs from legal partner feeds (Adzuna now; more later), ranked for a
          worker, with an AI-built tailored CV + cover letter and a review-and-apply hand-off. These are
          external leads — not JobLop jobs — and the worker always reviews and applies themselves.
          Nothing is submitted automatically.
        </p>
      </header>
      <JobScannerPanel />
    </main>
  );
}

const styles = {
  page: { background: "#f4f7fb", color: "#10233f", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { background: "#061b41", color: "#fff", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#d6e5f8", fontSize: 17, lineHeight: 1.6, maxWidth: 860 }
} as const;
