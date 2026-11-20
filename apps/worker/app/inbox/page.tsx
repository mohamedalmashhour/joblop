import { InboxPanel } from "./InboxPanel";
import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";
import { InboxHeading } from "./InboxHeading";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <InboxHeading />
        <InboxPanel />
      </main>
    </>
  );
}
