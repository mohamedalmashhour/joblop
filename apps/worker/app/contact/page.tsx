import { Suspense } from "react";
import { BackToDashboard } from "../BackToDashboard";
import { SiteHeader } from "../SiteHeader";
import { ContactJoblop } from "./ContactJoblop";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <Suspense>
          <ContactJoblop />
        </Suspense>
      </main>
    </>
  );
}
