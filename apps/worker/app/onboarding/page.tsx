import { SiteHeader } from "../SiteHeader";
import { Onboarding } from "./Onboarding";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <Onboarding />
      </main>
    </>
  );
}
