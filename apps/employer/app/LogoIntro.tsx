"use client";

import { useEffect, useState } from "react";

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
        background: "#000000",
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
        @keyframes joblopIntroShine {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 10,
          width: "min(78vw, 420px)",
          animation: "joblopIntroIn 1s cubic-bezier(0.16,1,0.3,1) both"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/joblop-logo.png" alt="" style={{ display: "block", width: "100%", height: "auto" }} />
        {/* a gold light that sweeps across the logo once it has landed */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "40%",
            background: "linear-gradient(90deg, transparent, rgba(248, 184, 8, 0.45), transparent)",
            animation: "joblopIntroShine 1.1s ease-in-out 0.8s both"
          }}
        />
      </div>
    </div>
  );
}
