import { VerificationPanel } from "./VerificationPanel";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <VerificationPanel />
      </main>
    </>
  );
}
