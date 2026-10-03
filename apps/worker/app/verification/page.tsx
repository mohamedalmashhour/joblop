import { VerificationPanel } from "./VerificationPanel";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <VerificationPanel />
      </main>
    </>
  );
}
