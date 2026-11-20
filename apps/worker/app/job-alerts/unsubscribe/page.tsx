import type { Metadata } from "next";
import { SiteHeader } from "../../SiteHeader";
import { UnsubscribeResult } from "./UnsubscribeResult";

export const metadata: Metadata = {
  title: "Job alert emails",
  robots: { index: false, follow: false }
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <UnsubscribeResult />
      </main>
    </>
  );
}
