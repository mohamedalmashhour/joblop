import { MarketplaceExplorer } from "./MarketplaceExplorer";
import { TopBar } from "./TopBar";

// The worker marketplace home: "search and discover jobs confidently." Everything
// authoritative (geocoding, distance, ranking, privacy) lives in the API; this page is
// the fast, visual front door. UI strings are bilingual (fr-CA / en-CA) per Bill 96.
export default function Page() {
  return (
    <>
      <TopBar />
      <main className="wrap">
        <MarketplaceExplorer />
      </main>
    </>
  );
}
