import { MyDocuments } from "./MyDocuments";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <MyDocuments />
      </main>
    </>
  );
}
