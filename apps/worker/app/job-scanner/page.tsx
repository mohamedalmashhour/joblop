import { JobScannerFeed } from "./JobScannerFeed";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <h1 style={{ color: "#fbf7ee", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>JobScanner</h1>
        <p style={{ color: "#cabfa8", fontSize: 16, lineHeight: 1.6, margin: "0 0 4px", maxWidth: 760 }}>
          More jobs for you, gathered from partner job boards across Québec. Search freely; create a free account to apply.
        </p>
        <JobScannerFeed />
      </main>
    </>
  );
}
