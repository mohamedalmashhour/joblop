import { MyPay } from "./MyPay";
import { SubPageHeader } from "../SubPageHeader";

export default function Page() {
  return (
    <>
      <SubPageHeader />
      <main className="wrap">
        <MyPay />
      </main>
    </>
  );
}
