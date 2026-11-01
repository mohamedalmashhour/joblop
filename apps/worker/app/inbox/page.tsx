import { InboxPanel } from "./InboxPanel";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <h1 style={{ color: "#15110b", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>My greetings &amp; awards</h1>
        <p style={{ color: "#6b6356", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 760 }}>
          Greeting cards and certificates sent to you by Joblop. You can print any certificate.
        </p>
        <InboxPanel />
      </main>
    </>
  );
}
