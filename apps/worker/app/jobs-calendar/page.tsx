import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";
import { JobsCalendar } from "./JobsCalendar";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <JobsCalendar />
      </main>
    </>
  );
}
