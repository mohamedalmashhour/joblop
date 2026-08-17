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

// Controlled, human-labelled document choices (values match the compliance requirement types).
const DOCUMENT_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "work_authorization", label: "Work authorization (permit / status)" },
  { value: "identity", label: "Government photo ID" },
  { value: "licence", label: "Driver's licence" },
  { value: "first_aid", label: "First-aid certificate" },
  { value: "qc_healthcare_doc", label: "Québec healthcare document" },
  { value: "sin", label: "Social Insurance Number document" },
  { value: "void_cheque", label: "Void cheque / direct-deposit form" }
];

export function MyDocuments() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Real secure upload path: obtain a storage reference + signed upload URL, PUT the chosen FILE to the
  // provider, then submit the metadata. The file bytes go to the storage provider, never through JobLop.
  const submit = useCallback(async (documentType: string, replace: boolean, chosen: File | null) => {
    if (!documentType.trim()) return;
    if (!chosen) { setError("Choose a file to upload before submitting."); return; }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const refRes = await fetch("/api/documents/upload-reference", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim() }) });
      if (!refRes.ok) { setError("Could not start a document submission. Please try again."); return; }
      const { storageReference, uploadUrl } = (await refRes.json()) as { storageReference: string; uploadUrl?: string };
      // Upload the file bytes to the provider's signed URL (skipped only when replacing without a new file).
      if (chosen && uploadUrl) {
        try {
          const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": chosen.type || "application/octet-stream" }, body: chosen });
          if (!put.ok) { setError("Your file could not be uploaded to secure storage. Please try again."); return; }
        } catch {
          setError("Your file could not be uploaded (storage unreachable in this environment). Please try again later.");
          return;
        }
      }
      const endpoint = replace ? "/api/documents/replace" : "/api/documents";
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim(), storageReference }) });
      if (!res.ok) { setError("Submission failed. Please try again."); return; }
      setNotice(replace ? "Replacement uploaded and submitted for review." : "Document uploaded and submitted for review.");
      setDocType("");
      setFile(null);
      setReplacing(false);
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

      {notice ? <p className="notice" role="status" style={{ color: "var(--accent)" }}>{notice}</p> : null}
      {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}

      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); void submit(docType, replacing, file); }}>
        <div className="field grow">
          <label htmlFor="doctype">Document type</label>
          <select id="doctype" value={docType} onChange={(e) => setDocType(e.target.value)} aria-describedby="doctype-help">
            <option value="">Choose a document type…</option>
            {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="docfile">File</label>
          <input id="docfile" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-describedby="doctype-help" />
        </div>
        <button className="btn" type="submit" disabled={busy || !docType.trim() || !file}>{busy ? "Uploading…" : "Upload document"}</button>
      </form>
      <p id="doctype-help" className="notice">Choose the document type and the file (PDF or image). JobLop reviews every submission.</p>

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
                <button className="btn ghost" type="button" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => { setReplacing(true); setDocType(d.documentType); setFile(null); setError(null); setNotice("Choose a new file above, then Upload document to replace this one."); }}>Replace</button>
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
