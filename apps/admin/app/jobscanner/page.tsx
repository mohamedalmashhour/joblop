import { JobScannerPanel } from "./JobScannerPanel";

export default function JobScannerPage() {
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / JobScanner</p>
        <h1 style={styles.title}>JobScanner</h1>
        <p style={styles.lede}>
          Aggregated external jobs from legal partner feeds (Adzuna now; more later), ranked for a
          worker, with an AI-built tailored CV + cover letter and a review-and-apply hand-off. These are
          external leads — not Joblop jobs — and the worker always reviews and applies themselves.
          Nothing is submitted automatically.
        </p>
      </header>
      <JobScannerPanel />
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
