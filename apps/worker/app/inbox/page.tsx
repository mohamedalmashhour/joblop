import { InboxPanel } from "./InboxPanel";
import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <h1 style={{ color: "var(--text)", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>My greetings &amp; awards</h1>
        <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 760 }}>
          Greeting cards and certificates sent to you by Joblop. You can print any certificate.
        </p>
        <InboxPanel />
      </main>
    </>
  );
}
