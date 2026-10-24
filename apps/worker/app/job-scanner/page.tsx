import { JobScannerFeed } from "./JobScannerFeed";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <h1 style={{ color: "#061b41", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>JobScanner</h1>
        <p style={{ color: "#5a6b85", fontSize: 16, lineHeight: 1.6, margin: "0 0 4px", maxWidth: 760 }}>
          More jobs for you — gathered from partner sources across Québec, ranked for your trade.
        </p>
        <JobScannerFeed />
      </main>
    </>
  );
}
