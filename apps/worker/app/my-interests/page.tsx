import { MyInterests } from "./MyInterests";
import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        <MyInterests />
      </main>
    </>
  );
}
