import { CvBuilder } from "./CvBuilder";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <h1 style={{ color: "#061b41", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>Build your CV</h1>
        <p style={{ color: "#5a6b85", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 760 }}>
          Answer a few quick questions, upload your certificates, pick a design — and get a ready CV and
          cover letter in minutes, in French or English. You review and edit before you apply.
        </p>
        <CvBuilder />
      </main>
    </>
  );
}
