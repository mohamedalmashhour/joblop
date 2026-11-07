import { AdminOrderReviewPanel } from "./AdminOrderReviewPanel";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Joblop / Administration</p>
        <h1 style={styles.title}>Order review</h1>
        <p style={styles.lede}>
          Review each role line. Begin review, then approve for dispatch with a margin (default 20%)
          or request information. Approving captures the immutable pricing snapshot for that role.
        </p>
      </header>
      <AdminOrderReviewPanel orderId={orderId} />
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
