import { CvBuilder } from "./CvBuilder";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        {/* R2-16: an explicit close (✕) so the worker can exit the builder back to their home page. */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ color: "#15110b", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>Build your CV</h1>
          <a
            href="/"
            aria-label="Close CV builder"
            title="Close"
            style={{
              flex: "0 0 auto", marginTop: 20, width: 40, height: 40, borderRadius: 999,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #e3d7c0", background: "#fff", color: "#6b6356",
              fontSize: 20, fontWeight: 700, textDecoration: "none", lineHeight: 1
            }}
          >
            ✕
          </a>
        </div>
        <p style={{ color: "#6b6356", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 760 }}>
          Answer a few quick questions, upload your certificates, pick a design — and get a ready CV and
          cover letter in minutes, in French or English. You review and edit before you apply.
        </p>
        <CvBuilder />
      </main>
    </>
  );
}
