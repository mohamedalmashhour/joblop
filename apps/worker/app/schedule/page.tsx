import { MySchedule } from "./MySchedule";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <MySchedule />
      </main>
    </>
  );
}
