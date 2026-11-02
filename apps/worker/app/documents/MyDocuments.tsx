"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";
import { resolveDeniedKind } from "../resolveDenied";

type Doc = Readonly<{ id: string; documentType: string; jurisdiction: string | null; expiresAt: string | null; effectiveStatus: string; supersededById: string | null }>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "needs_setup" }
  | { status: "error" }
  | { status: "ready"; documents: readonly Doc[] };

const STATUS_KEY: Record<string, MessageKey> = {
  submitted: "doc.statusSubmitted",
  under_review: "doc.statusUnderReview",
  accepted: "doc.statusAccepted",
  rejected: "doc.statusRejected",
  expiring: "doc.statusExpiring",
  expired: "doc.statusExpired",
  superseded: "doc.statusSuperseded",
  revoked: "doc.statusRevoked",
  required: "doc.statusRequired"
};

// Controlled document choices (values match the compliance requirement types); labels are keyed.
const DOCUMENT_TYPES: ReadonlyArray<{ value: string; labelKey: MessageKey }> = [
  { value: "work_authorization", labelKey: "doc.typeWorkAuth" },
  { value: "identity", labelKey: "doc.typeIdentity" },
  { value: "licence", labelKey: "doc.typeLicence" },
  { value: "first_aid", labelKey: "doc.typeFirstAid" },
  { value: "qc_healthcare_doc", labelKey: "doc.typeQcHealth" },
  { value: "sin", labelKey: "doc.typeSin" },
  { value: "void_cheque", labelKey: "doc.typeVoidCheque" }
];
const DOC_TYPE_LABEL_KEY: Record<string, MessageKey> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.labelKey])
) as Record<string, MessageKey>;

export function MyDocuments() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [docType, setDocType] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/documents", { cache: "no-store" });
      if (r.status === 401) return setState({ status: await resolveDeniedKind() });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { documents: Doc[] };
      setState({ status: "ready", documents: payload.documents });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Real secure upload path: obtain a storage reference + signed upload URL, PUT the chosen FILE to the
  // provider, then submit the metadata. The file bytes go to the storage provider, never through Joblop.
  // Upload ONE file end to end (ref → PUT → metadata). Returns true on success; no form-state reset.
  const uploadOne = useCallback(async (documentType: string, replace: boolean, chosen: File): Promise<boolean> => {
    const refRes = await fetch("/api/documents/upload-reference", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim() }) });
    if (!refRes.ok) { setError(t("doc.startFailed")); return false; }
    const { storageReference, uploadUrl } = (await refRes.json()) as { storageReference: string; uploadUrl?: string };
    if (uploadUrl) {
      try {
        const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": chosen.type || "application/octet-stream" }, body: chosen });
        if (!put.ok) { setError(t("doc.uploadFailed")); return false; }
      } catch {
        setError(t("doc.uploadUnreachable"));
        return false;
      }
    }
    const endpoint = replace ? "/api/documents/replace" : "/api/documents";
    const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim(), storageReference }) });
    if (!res.ok) { setError(t("doc.submitFailed")); return false; }
    return true;
  }, [t]);

  // Submit the chosen file(s): replace affects exactly one; a new upload accepts MULTIPLE files of the type.
  const submit = useCallback(async (documentType: string, replace: boolean, chosen: readonly File[]) => {
    if (!documentType.trim()) return;
    if (chosen.length === 0) { setError(t("doc.chooseFileFirst")); return; }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      let ok = 0;
      for (const f of (replace ? chosen.slice(0, 1) : chosen)) {
        if (await uploadOne(documentType, replace, f)) ok++;
        else break;
      }
      if (ok > 0) {
        setNotice(replace ? t("doc.replacementSubmitted") : t("doc.submitted"));
        setDocType("");
        setFiles([]);
        setReplacing(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [load, t, uploadOne]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("doc.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "needs_setup") return <div className="state">{t("common.needsWorkerSetup")}<div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("doc.loadError")}</div>;

  const active = state.documents.filter((d) => d.effectiveStatus !== "superseded");

  return (
    <>
      <section className="hero">
        <h1>{t("doc.title")}</h1>
        <p>{t("doc.intro")}</p>
      </section>

      {notice ? <p className="notice" role="status" style={{ color: "var(--accent)" }}>{notice}</p> : null}
      {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}

      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); void submit(docType, replacing, files); }}>
        <div className="field grow">
          <label htmlFor="doctype">{t("doc.documentType")}</label>
          <select id="doctype" value={docType} onChange={(e) => setDocType(e.target.value)} aria-describedby="doctype-help">
            <option value="">{t("doc.chooseType")}</option>
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{t(d.labelKey)}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="docfile">{t("doc.file")}</label>
          <input id="docfile" type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} aria-describedby="doctype-help" />
        </div>
        <button className="btn" type="submit" disabled={busy || !docType.trim() || files.length === 0}>{busy ? t("doc.uploading") : t("doc.uploadDocument")}</button>
      </form>
      <p id="doctype-help" className="notice">{t("doc.formHelp")}</p>

      <div className="results" style={{ paddingBottom: 48 }}>
        {active.length === 0 ? (
          <div className="state">{t("doc.none")}</div>
        ) : (
          active.map((d) => {
            const labelKey = DOC_TYPE_LABEL_KEY[d.documentType];
            return (
            <article key={d.id} className="card">
              <div className="role">{labelKey ? t(labelKey) : d.documentType}</div>
              <div className="chips">
                <span className={`chip status-${badgeClass(d.effectiveStatus)}`}>{t(STATUS_KEY[d.effectiveStatus] ?? "doc.statusRequired")}</span>
                {d.expiresAt ? <span className="chip">{t("common.expires", { date: new Date(d.expiresAt).toLocaleDateString(locale) })}</span> : null}
                {d.jurisdiction ? <span className="chip">{d.jurisdiction}</span> : null}
              </div>
              {["accepted", "expiring", "expired", "rejected"].includes(d.effectiveStatus) ? (
                <button className="btn ghost" type="button" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => { setReplacing(true); setDocType(d.documentType); setFiles([]); setError(null); setNotice(t("doc.chooseNewToReplace")); }}>{t("doc.replace")}</button>
              ) : null}
            </article>
          );
          })
        )}
      </div>

      <p className="notice">{t("doc.footer")}</p>
    </>
  );
}

function badgeClass(status: string): string {
  if (status === "accepted") return "verified";
  if (status === "submitted" || status === "under_review" || status === "expiring") return "pending";
  if (status === "expired" || status === "rejected" || status === "revoked") return "rejected";
  return "unverified";
}
