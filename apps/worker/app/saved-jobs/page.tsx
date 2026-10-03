import { SavedJobs } from "./SavedJobs";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <SavedJobs />
      </main>
    </>
  );
}
