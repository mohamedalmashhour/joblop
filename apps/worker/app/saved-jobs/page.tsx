import { SavedJobs } from "./SavedJobs";
import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <SavedJobs />
      </main>
    </>
  );
}
