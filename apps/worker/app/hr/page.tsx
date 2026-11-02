import { MyHrProfile } from "./MyHrProfile";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <MyHrProfile />
      </main>
    </>
  );
}
