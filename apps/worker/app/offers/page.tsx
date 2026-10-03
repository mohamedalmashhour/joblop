import { Offers } from "./Offers";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <Offers />
      </main>
    </>
  );
}
