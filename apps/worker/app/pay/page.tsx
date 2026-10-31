import { MyPay } from "./MyPay";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <MyPay />
      </main>
    </>
  );
}
