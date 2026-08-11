import { MarketplaceExplorer } from "./MarketplaceExplorer";

// The worker marketplace home: "search and discover jobs confidently." Everything
// authoritative (geocoding, distance, ranking, privacy) lives in the API; this page is
// the fast, visual front door.
export default function Page() {
  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <div className="brand">
            Job<span>Lop</span>
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            Find work near you
          </div>
        </div>
      </header>
      <main className="wrap">
        <MarketplaceExplorer />
      </main>
    </>
  );
}
