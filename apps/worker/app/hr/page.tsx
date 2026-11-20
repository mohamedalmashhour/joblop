import { MyHrProfile } from "./MyHrProfile";
import { SiteHeader } from "../SiteHeader";
import { BackToDashboard } from "../BackToDashboard";
import { AddEmailCard } from "../AddEmailCard";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <BackToDashboard />
        {/* Shown only while the worker has no confirmed email (item 45). */}
        <AddEmailCard />
        <MyHrProfile />
      </main>
    </>
  );
}
