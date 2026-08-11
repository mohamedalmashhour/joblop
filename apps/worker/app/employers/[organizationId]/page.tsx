import { EmployerProfile } from "./EmployerProfile";

export default async function Page({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
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
        <EmployerProfile id={organizationId} />
      </main>
    </>
  );
}
