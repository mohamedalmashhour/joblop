import Link from "next/link";

// Global footer for the worker app: copyright + legal links on every page.
export function Footer({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid #faf6ec",
        marginTop: 56,
        padding: "22px 16px",
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 12.5,
        color: "#6b6356"
      }}
    >
      <span>© {year} JobLop · 9375-7649 Québec inc.</span>
      <nav style={{ display: "flex", gap: 20 }}>
        <Link href="/terms" style={{ color: "#b8862f", textDecoration: "none" }}>
          {fr ? "Conditions d’utilisation" : "Terms"}
        </Link>
        <Link href="/privacy" style={{ color: "#b8862f", textDecoration: "none" }}>
          {fr ? "Confidentialité" : "Privacy"}
        </Link>
      </nav>
    </footer>
  );
}
