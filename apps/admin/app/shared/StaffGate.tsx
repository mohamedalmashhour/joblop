"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SignedOut } from "./SignedOut";

// For staff pages whose panel has no signed-out message of its own: checks the session once and
// shows the shared sign-in block when signed out. While checking (or if the check itself fails)
// the page renders as before, so this never hides a working page.
export function StaffGate({ children }: Readonly<{ children: ReactNode }>) {
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => {
        if (live && (response.status === 401 || response.status === 403)) setSignedOut(true);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return signedOut ? <SignedOut /> : <>{children}</>;
}
