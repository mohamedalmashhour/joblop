import { HowItWorks } from "./HowItWorks";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <HowItWorks />
      </main>
    </>
  );
}
