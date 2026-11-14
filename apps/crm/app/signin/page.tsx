import { Suspense } from "react";
import { ui } from "../ui";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in — Joblop CRM" };

export default function CrmSignInPage() {
  return (
    <main id="crm-main" style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>Joblop / CRM</p>
        <h1 style={styles.title}>Staff sign in</h1>
        <p style={styles.copy}>
          The CRM is for Joblop staff only. Enter your staff phone number to receive a one-time code.
        </p>
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: ui.black,
    color: ui.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: ui.raised,
    border: `1px solid ${ui.hairline}`,
    borderRadius: 16,
    padding: "32px clamp(20px, 5vw, 36px)"
  },
  eyebrow: { color: ui.gold, fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: 0 },
  title: { fontSize: 30, margin: "8px 0 10px" },
  copy: { color: ui.muted, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" }
} as const;
