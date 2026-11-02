import { MySchedule } from "./MySchedule";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <MySchedule />
      </main>
    </>
  );
}
