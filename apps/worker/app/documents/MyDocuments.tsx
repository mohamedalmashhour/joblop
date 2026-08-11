"use client";

import { useCallback, useEffect, useState } from "react";

type Doc = Readonly<{ id: string; documentType: string; jurisdiction: string | null; expiresAt: string | null; effectiveStatus: string; supersededById: string | null }>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error" }
  | { status: "ready"; documents: readonly Doc[] };

const STATUS_COPY: Record<string, string> = {
  submitted: "Submitted — awaiting review",
  under_review: "Under review",
  accepted: "Accepted ✓",
  rejected: "Not accepted — please resubmit",
  expiring: "Expiring soon — please replace",
  expired: "Expired — action needed",
  superseded: "Replaced",
  revoked: "Revoked",
  required: "Required"
};

export function MyDocuments() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [docType, setDocType] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/documents", { cache: "no-store" });
      if (r.status === 401) return setState({ status: "signed_out" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { documents: Doc[] };
      setState({ status: "ready", documents: payload.documents });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Submit = obtain a storage reference from the provider, then submit the metadata. (In
  // production the worker uploads the actual file to the provider's signed URL first.)
  const submit = useCallback(async (documentType: string, replace: boolean) => {
    if (!documentType.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const refRes = await fetch("/api/documents/upload-reference", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim() }) });
      if (!refRes.ok) { setNotice("Could not start a document submission."); return; }
      const { storageReference } = await refRes.json();
      const endpoint = replace ? "/api/documents/replace" : "/api/documents";
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim(), storageReference }) });
      if (!res.ok) { setNotice("Submission failed. Please try again."); return; }
      setNotice(replace ? "Replacement submitted." : "Document submitted for review.");
      setDocType("");
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (state.status === "loading") return <div className="state">Loading…</div>;
  if (state.status === "signed_out") return <div className="state">Please sign in to see your documents.<div style={{ marginTop: 12 }}><a className="btn" href="/">Go to search</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">We couldn&apos;t load your documents.</div>;

  const active = state.documents.filter((d) => d.effectiveStatus !== "superseded");

  return (
    <>
      <section className="hero">
        <h1>My documents</h1>
        <p>Submit and track your employment + compliance documents. JobLop reviews them — you can&apos;t approve your own.</p>
      </section>

      {notice ? <p className="notice" style={{ color: "var(--accent)" }}>{notice}</p> : null}

      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); void submit(docType, false); }}>
        <div className="field grow">
          <label htmlFor="doctype">Document type</label>
          <input id="doctype" value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. work_authorization" />
        </div>
        <button className="btn" type="submit" disabled={busy || !docType.trim()}>{busy ? "Submitting…" : "Submit document"}</button>
      </form>

      <div className="results" style={{ paddingBottom: 48 }}>
        {active.length === 0 ? (
          <div className="state">No documents yet. Submit one above.</div>
        ) : (
          active.map((d) => (
            <article key={d.id} className="card">
              <div className="role">{d.documentType}</div>
              <div className="chips">
                <span className={`chip status-${badgeClass(d.effectiveStatus)}`}>{STATUS_COPY[d.effectiveStatus] ?? d.effectiveStatus}</span>
                {d.expiresAt ? <span className="chip">Expires {new Date(d.expiresAt).toLocaleDateString()}</span> : null}
                {d.jurisdiction ? <span className="chip">{d.jurisdiction}</span> : null}
              </div>
              {["accepted", "expiring", "expired", "rejected"].includes(d.effectiveStatus) ? (
                <button className="btn ghost" type="button" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => void submit(d.documentType, true)}>Replace</button>
              ) : null}
            </article>
          ))
        )}
      </div>

      <p className="notice">JobLop reviews your documents. You cannot approve your own document or change its review status.</p>
    </>
  );
}

function badgeClass(status: string): string {
  if (status === "accepted") return "verified";
  if (status === "submitted" || status === "under_review" || status === "expiring") return "pending";
  if (status === "expired" || status === "rejected" || status === "revoked") return "rejected";
  return "unverified";
}
