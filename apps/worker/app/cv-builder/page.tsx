import { CvBuilder } from "./CvBuilder";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <h1 style={{ color: "#15110b", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>Build your CV</h1>
        <p style={{ color: "#6b6356", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 760 }}>
          Answer a few quick questions, upload your certificates, pick a design — and get a ready CV and
          cover letter in minutes, in French or English. You review and edit before you apply.
        </p>
        <CvBuilder />
      </main>
    </>
  );
}
