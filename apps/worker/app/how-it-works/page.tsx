import { HowItWorks } from "./HowItWorks";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <HowItWorks />
      </main>
    </>
  );
}
