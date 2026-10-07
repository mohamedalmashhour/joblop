import Link from "next/link";

export default function PrivacyPage() {
  const version = process.env.PRIVACY_NOTICE_VERSION;
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px", fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif", color: "#0f1d33" }}>
      <Link href="/" style={{ color: "#3b3bee", textDecoration: "none", fontSize: 13 }}>← JobLop</Link>
      <h1 style={{ fontSize: 26, marginTop: 14 }}>Privacy Policy</h1>
      <p style={{ color: "#5c749c", fontSize: 14 }}>
        {version
          ? `Applicable version: ${version}. The approved publication text is provided through JobLop’s governed legal release.`
          : "No approved Privacy version is configured yet."}
      </p>
    </main>
  );
}
