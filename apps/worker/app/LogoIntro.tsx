"use client";

import { useEffect, useState } from "react";
import { JoblopLogo } from "./JoblopLogo";

// First-open brand intro: a big Joblop logo on a black screen that fades/scales in with a soft gold
// glow, then fades to the site. Shown ONCE per browser session (sessionStorage) so it plays on first
// open, not on every navigation. Skipped for reduced-motion; dismissible by click/tap. CSS-only, no video.
const SEEN_KEY = "joblop_intro_seen_v1";

export function LogoIntro() {
  // Start hidden; an effect decides whether to play (so SSR/first paint never flashes it wrongly).
  const [phase, setPhase] = useState<"idle" | "in" | "hiding" | "done">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let alreadySeen: boolean;
    try {
      alreadySeen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) {
      setPhase("done");
      return;
    }
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode / blocked storage — still play once this load */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    setPhase("in");
    const hide = window.setTimeout(() => setPhase("hiding"), 1900);
    const done = window.setTimeout(() => setPhase("done"), 2550);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      onClick={() => setPhase("done")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        cursor: "pointer",
        opacity: phase === "hiding" ? 0 : 1,
        transition: "opacity 0.6s ease"
      }}
    >
      <style>{`
        @keyframes joblopIntroIn {
          0% { opacity: 0; transform: translateY(14px) scale(0.86); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes joblopIntroGlow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.12); }
        }
      `}</style>
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        {/* soft gold glow behind the mark */}
        <div
          style={{
            position: "absolute",
            width: 320,
            maxWidth: "80vw",
            height: 320,
            maxHeight: "80vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(214,166,58,0.45) 0%, rgba(214,166,58,0) 68%)",
            filter: "blur(6px)",
            animation: "joblopIntroGlow 1.8s ease-in-out infinite"
          }}
        />
        <div
          style={{
            position: "relative",
            animation: "joblopIntroIn 1s cubic-bezier(0.16,1,0.3,1) both"
          }}
        >
          <JoblopLogo height={150} />
        </div>
      </div>
    </div>
  );
}
