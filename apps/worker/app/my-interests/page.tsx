import { MyInterests } from "./MyInterests";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <MyInterests />
      </main>
    </>
  );
}
