"use client";

import { useEffect } from "react";

// After a scanner search the page reloads with ?scan=…; bring the visitor back to the results.
export function ScrollToScanner() {
  useEffect(() => {
    document.getElementById("scanner")?.scrollIntoView({ block: "start" });
  }, []);
  return null;
}
