import { MyInterests } from "./MyInterests";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <MyInterests />
      </main>
    </>
  );
}
