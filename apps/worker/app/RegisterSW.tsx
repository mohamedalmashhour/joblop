"use client";

import { useEffect } from "react";

// Registers the service worker so JobLop is installable (PWA) and TWA-ready. No-op where unsupported.
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — the app works without it */
      });
    }
  }, []);
  return null;
}
