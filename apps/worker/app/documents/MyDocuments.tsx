"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { workerProfileRating, type WorkerProfileTier } from "@rwos/shared";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";
import { resolveDeniedKind } from "../resolveDenied";

type Doc = Readonly<{ id: string; documentType: string; fileName?: string | null; contentType?: string | null; jurisdiction: string | null; expiresAt: string | null; effectiveStatus: string; supersededById: string | null }>;
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
  { value: "cv", labelKey: "doc.typeCv" },
  { value: "licence", labelKey: "doc.typeLicence" },
  { value: "certificate", labelKey: "doc.typeCertificate" },
  { value: "photo", labelKey: "doc.typePhoto" },
  { value: "first_aid", labelKey: "doc.typeFirstAid" },
  { value: "qc_healthcare_doc", labelKey: "doc.typeQcHealth" },
  { value: "sin", labelKey: "doc.typeSin" },
  { value: "void_cheque", labelKey: "doc.typeVoidCheque" }
];
const DOC_TYPE_LABEL_KEY: Record<string, MessageKey> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.labelKey])
) as Record<string, MessageKey>;

// Mirrors the API's allowlist and 10 MB cap, so a worker hears why a file is refused before uploading.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", heic: "image/heic", heif: "image/heif", tif: "image/tiff", tiff: "image/tiff", txt: "text/plain",
  doc: "application/msword", odt: "application/vnd.oasis.opendocument.text",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};
const ACCEPT = Object.keys(FILE_TYPES).map((ext) => `.${ext}`).join(",");

// The file's real type. Browsers leave `type` empty for some formats (HEIC on many), so fall back to
// the extension. Null means the API would refuse it.
function allowedType(file: File): string | null {
  if (Object.values(FILE_TYPES).includes(file.type)) return file.type;
  return FILE_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

const TIER_KEY: Record<WorkerProfileTier, MessageKey> = {
  starter: "doc.tierStarter",
  good: "doc.tierGood",
  strong: "doc.tierStrong",
  top: "doc.tierTop"
};

// Advisory AI verdict → label + badge colour.
const AI_VERDICT_KEY: Record<string, MessageKey> = {
  ai_approved: "doc.aiApproved",
  needs_reupload: "doc.aiReupload",
  human_required: "doc.aiHuman",
  error: "doc.aiError"
};
const AI_VERDICT_BADGE: Record<string, string> = {
  ai_approved: "verified",
  needs_reupload: "rejected",
  human_required: "pending",
  error: "rejected"
};

export function MyDocuments() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [docType, setDocType] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [replacing, setReplacing] = useState<Doc | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Bumped to clear the file input, which React cannot reset through a value.
  const [fileInputKey, setFileInputKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Advisory AI review results, keyed by document id (ephemeral — not persisted).
  const [aiVerdicts, setAiVerdicts] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const aiReview = useCallback(async (documentId: string) => {
    setAiBusy(documentId);
    try {
      const r = await fetch(`/api/documents/${encodeURIComponent(documentId)}/ai-review`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!r.ok) { setAiVerdicts((v) => ({ ...v, [documentId]: "error" })); return; }
      const p = (await r.json()) as { verdict?: { status?: string } };
      setAiVerdicts((v) => ({ ...v, [documentId]: p.verdict?.status ?? "human_required" }));
    } catch {
      setAiVerdicts((v) => ({ ...v, [documentId]: "error" }));
    } finally {
      setAiBusy(null);
    }
  }, []);

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

  const removeDoc = useCallback(async (documentId: string) => {
    setBusy(true);
    setConfirmDelete(null);
    setError(null);
    try {
      const r = await fetch(`/api/documents/${encodeURIComponent(documentId)}/remove`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!r.ok) { setError(t("doc.removeFailed")); return; }
      setNotice(t("doc.removed"));
      await load();
    } catch {
      setError(t("doc.removeFailed"));
    } finally {
      setBusy(false);
    }
  }, [load, t]);

  // Real secure upload path: obtain a storage reference + signed upload URL, PUT the chosen FILE to the
  // provider, then submit the metadata. The file bytes go to the storage provider, never through Joblop.
  // Upload ONE file end to end (ref → PUT → metadata). Returns true on success; no form-state reset.
  const uploadOne = useCallback(async (documentType: string, replace: boolean, chosen: File): Promise<boolean> => {
    const contentType = allowedType(chosen);
    if (!contentType) { setError(t("doc.fileTypeNotAllowed", { name: chosen.name })); return false; }
    if (chosen.size > MAX_FILE_BYTES) { setError(t("doc.fileTooLarge", { name: chosen.name })); return false; }
    const refRes = await fetch("/api/documents/upload-reference", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentType: documentType.trim() }) });
    if (!refRes.ok) { setError(t("doc.startFailed")); return false; }
    const { storageReference, uploadUrl } = (await refRes.json()) as { storageReference: string; uploadUrl?: string };
    if (uploadUrl) {
      try {
        const put = await fetch(`${uploadUrl}&name=${encodeURIComponent(chosen.name)}`, { method: "PUT", headers: { "content-type": contentType }, body: chosen });
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
  const submit = useCallback(async (documentType: string, replaced: Doc | null, chosen: readonly File[]) => {
    const replace = replaced !== null;
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
        // The API only supersedes an accepted document, so retire a not-yet-accepted original here.
        if (replaced && replaced.effectiveStatus !== "accepted") {
          await fetch(`/api/documents/${encodeURIComponent(replaced.id)}/remove`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        }
        setNotice(replace ? t("doc.replacementSubmitted") : t("doc.submitted"));
        setDocType("");
        setFiles([]);
        setFileInputKey((k) => k + 1);
        setReplacing(null);
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

  const active = state.documents.filter((d) => d.effectiveStatus !== "superseded" && d.effectiveStatus !== "revoked");
  const rating = workerProfileRating(state.documents);
  const hasPayDocument = active.some((d) => d.documentType === "void_cheque");

  return (
    <>
      <section className="hero">
        <h1>{t("doc.title")}</h1>
        <p>{t("doc.intro")}</p>
      </section>

      {notice ? <p className="notice" role="status" style={{ color: "var(--accent)" }}>{notice}</p> : null}
      {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}

      <section className="card" aria-labelledby="profile-rating" style={{ marginBottom: 16 }}>
        <div id="profile-rating" className="role">{t("doc.ratingTitle", { score: rating.score, tier: t(TIER_KEY[rating.tier]) })}</div>
        <div role="progressbar" aria-valuenow={rating.score} aria-valuemin={0} aria-valuemax={100} aria-labelledby="profile-rating" style={{ height: 8, borderRadius: 999, background: "var(--line, #333)", overflow: "hidden" }}>
          <div style={{ width: `${rating.score}%`, height: "100%", background: "var(--accent)" }} />
        </div>
        <p className="notice" style={{ margin: 0 }}>{rating.jobLimit === null ? t("doc.ratingAllJobs") : t("doc.ratingJobs", { count: rating.jobLimit })}</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {rating.items.map((item) => (
            <li key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span aria-hidden="true">{item.done ? "✅" : "⬜"}</span>
              <span style={{ flex: "1 1 160px" }}>{t(DOC_TYPE_LABEL_KEY[item.key] ?? "doc.typeCertificate")} <span className="notice">+{item.points}</span></span>
              {item.done ? <span className="chip status-verified">{t("doc.itemDone")}</span> : (
                <button className="btn ghost" type="button" onClick={() => { setReplacing(null); setDocType(item.key); setError(null); formRef.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("doc.itemUpload")}</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="pay-document" style={{ marginBottom: 16 }}>
        <div id="pay-document" className="role">{t("doc.payTitle")}</div>
        <p className="notice" style={{ margin: 0 }}>{t("doc.payIntro")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span aria-hidden="true">{hasPayDocument ? "✅" : "⬜"}</span>
          <span style={{ flex: "1 1 160px" }}>{t("doc.typeVoidCheque")}</span>
          {hasPayDocument ? <span className="chip status-verified">{t("doc.itemDone")}</span> : (
            <button className="btn ghost" type="button" onClick={() => { setReplacing(null); setDocType("void_cheque"); setError(null); formRef.current?.scrollIntoView({ behavior: "smooth" }); }}>{t("doc.itemUpload")}</button>
          )}
        </div>
      </section>

      <form ref={formRef} className="searchbar" onSubmit={(e) => {
        e.preventDefault();
        // Cap: at most 6 live certificates (those still on the list + the files being added).
        if (docType === "certificate" && !replacing) {
          const existing = active.filter((d) => d.documentType === "certificate").length;
          if (existing + files.length > 6) { setError(t("doc.certLimit")); return; }
        }
        void submit(docType, replacing, files);
      }}>
        <div className="field grow">
          <label htmlFor="doctype">{t("doc.documentType")}</label>
          <select id="doctype" value={docType} disabled={replacing !== null} onChange={(e) => setDocType(e.target.value)} aria-describedby="doctype-help">
            <option value="">{t("doc.chooseType")}</option>
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{t(d.labelKey)}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="docfile">{t("doc.file")}</label>
          <input key={fileInputKey} id="docfile" type="file" multiple={replacing === null} accept={ACCEPT} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} aria-describedby="doctype-help" />
        </div>
        <button className="btn" type="submit" disabled={busy || !docType.trim() || files.length === 0}>{busy ? t("doc.uploading") : t("doc.uploadDocument")}</button>
      </form>
      <p id="doctype-help" className="notice">{t("doc.formHelp")}</p>
      {replacing ? (
        <p className="notice" role="status">
          {t("doc.chooseNewToReplace")}{" "}
          <button className="linkbtn" type="button" onClick={() => { setReplacing(null); setDocType(""); setFiles([]); setFileInputKey((k) => k + 1); setNotice(null); }}>{t("doc.cancel")}</button>
        </p>
      ) : null}

      <div className="results" style={{ paddingBottom: 48 }}>
        {active.length === 0 ? (
          <div className="state">{t("doc.none")}</div>
        ) : (
          active.map((d) => {
            const labelKey = DOC_TYPE_LABEL_KEY[d.documentType];
            const verdict = aiVerdicts[d.id];
            return (
            <article key={d.id} className="card">
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <a href={`/api/documents/${d.id}/file?mode=view`} target="_blank" rel="noopener" aria-label={t("doc.view")} style={{ flex: "none", width: 56, height: 56, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid var(--line, #333)", overflow: "hidden", textDecoration: "none", fontSize: 11, fontWeight: 800 }}>
                  {/* Bytes come from an authenticated route that next/image cannot fetch. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {["image/jpeg", "image/png", "image/webp", "image/gif"].includes(d.contentType ?? "") ? <img src={`/api/documents/${d.id}/file?mode=view`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{(d.fileName?.split(".").pop() ?? "FILE").slice(0, 4).toUpperCase()}</span>}
                </a>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div className="role" style={{ overflowWrap: "anywhere" }}>{d.fileName ?? (labelKey ? t(labelKey) : d.documentType)}</div>
                  {d.fileName && labelKey ? <div className="notice" style={{ margin: 0 }}>{t(labelKey)}</div> : null}
                </div>
                <div className="chips" style={{ flex: "none" }}>
                  <a className="btn ghost" href={`/api/documents/${d.id}/file?mode=view`} target="_blank" rel="noopener">{t("doc.view")}</a>
                  <a className="btn ghost" href={`/api/documents/${d.id}/file?mode=save`}>{t("doc.save")}</a>
                  <button className="btn ghost" type="button" disabled={busy} onClick={() => { setReplacing(d); setDocType(d.documentType); setFiles([]); setFileInputKey((k) => k + 1); setError(null); setNotice(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("doc.replace")}</button>
                  <button className="btn ghost" type="button" disabled={busy} onClick={() => setConfirmDelete(d.id)}>{t("doc.remove")}</button>
                </div>
              </div>
              {confirmDelete === d.id ? (
                <div className="chips" role="alertdialog" aria-label={t("doc.confirmDelete")} style={{ marginTop: 8, alignItems: "center" }}>
                  <span>{t("doc.confirmDelete")}</span>
                  <button className="btn" type="button" disabled={busy} onClick={() => void removeDoc(d.id)}>{t("doc.confirmYes")}</button>
                  <button className="btn ghost" type="button" onClick={() => setConfirmDelete(null)}>{t("doc.cancel")}</button>
                </div>
              ) : null}
              <div className="chips">
                <span className={`chip status-${badgeClass(d.effectiveStatus)}`}>{t(STATUS_KEY[d.effectiveStatus] ?? "doc.statusRequired")}</span>
                {d.expiresAt ? <span className="chip">{t("common.expires", { date: new Date(d.expiresAt).toLocaleDateString(locale) })}</span> : null}
                {d.jurisdiction ? <span className="chip">{d.jurisdiction}</span> : null}
              </div>
              <div className="chips" style={{ marginTop: 6 }}>
                <button className="btn ghost" type="button" disabled={aiBusy === d.id} onClick={() => void aiReview(d.id)}>{aiBusy === d.id ? t("doc.aiReviewing") : t("doc.aiReview")}</button>
                {verdict ? (
                  <span className={`chip status-${AI_VERDICT_BADGE[verdict] ?? "pending"}`}>
                    {t(AI_VERDICT_KEY[verdict] ?? "doc.aiHuman")} · {t("doc.aiAdvisory")}
                  </span>
                ) : null}
              </div>
            </article>
          );
          })
        )}
      </div>

      {active.length > 0 ? (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--accent)" }}>
          <div className="role">{t("doc.doneTitle")}</div>
          <p className="notice" style={{ margin: 0 }}>{t("doc.doneBody")}</p>
          <a className="btn" href="/" style={{ alignSelf: "flex-start", marginTop: 8 }}>{t("doc.nextStep")}</a>
        </div>
      ) : null}

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
