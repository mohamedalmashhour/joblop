import { MyHrProfile } from "./MyHrProfile";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <MyHrProfile />
      </main>
    </>
  );
}
