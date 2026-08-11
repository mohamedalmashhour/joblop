import { VerificationPanel } from "./VerificationPanel";

export default function Page() {
  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a className="brand" href="/">
            Job<span>Lop</span>
          </a>
          <a className="muted" href="/" style={{ fontSize: 14 }}>
            ← Back to search
          </a>
        </div>
      </header>
      <main className="wrap">
        <VerificationPanel />
      </main>
    </>
  );
}
