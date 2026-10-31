import { Offers } from "./Offers";
import { SiteHeader } from "../SiteHeader";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <Offers />
      </main>
    </>
  );
}
