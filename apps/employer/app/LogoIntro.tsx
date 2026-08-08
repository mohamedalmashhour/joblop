"use client";

import { useEffect, useState } from "react";
import { JobLopLogo } from "./JobLopLogo";

// Clean, watermark-free animated logo intro (SVG + CSS, no video).
// Fades to the page automatically; dismissible by click; skipped for reduced motion.
export function LogoIntro() {
  const [phase, setPhase] = useState<"in" | "hiding" | "done">("in");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("done");
      return;
    }
    const hide = window.setTimeout(() => setPhase("hiding"), 2100);
    const done = window.setTimeout(() => setPhase("done"), 2750);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      onClick={() => setPhase("done")}
      style={{
        alignItems: "center",
        background: "#ffffff",
        cursor: "pointer",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        opacity: phase === "hiding" ? 0 : 1,
        position: "fixed",
        transition: "opacity 0.6s ease",
        zIndex: 1000
      }}
    >
      <style>{`
        @keyframes joblopIntroIn {
          0% { opacity: 0; transform: translateY(16px) scale(0.9); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes joblopIntroPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
      <div
        style={{
          animation:
            "joblopIntroIn 1s cubic-bezier(0.16,1,0.3,1) both, joblopIntroPulse 1.6s ease-in-out 1s infinite"
        }}
      >
        <JobLopLogo height={96} />
      </div>
    </div>
  );
}
