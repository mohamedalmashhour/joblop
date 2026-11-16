"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "./ui";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/session/sign-out", { method: "POST" });
    } catch {
      // The cookie is cleared server-side regardless; fall through to the sign-in screen.
    } finally {
      router.replace("/signin");
    }
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} style={styles.button}>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

const styles = {
  button: {
    background: "transparent",
    border: `1px solid ${ui.hairlineSoft}`,
    borderRadius: 8,
    color: ui.muted,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    padding: "7px 12px"
  }
} as const;
