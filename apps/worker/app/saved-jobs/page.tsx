import { SavedJobs } from "./SavedJobs";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <SavedJobs />
      </main>
    </>
  );
}
