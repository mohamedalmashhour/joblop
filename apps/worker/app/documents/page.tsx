import { MyDocuments } from "./MyDocuments";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <MyDocuments />
      </main>
    </>
  );
}
