"use client";

import { useCallback, useEffect, useState } from "react";
import { REQUIRED_CERTIFICATE_KEYS, certificateKeyForDocumentType, certificateLabel, type RequiredCertificateKey } from "@rwos/shared";
import { usePageText } from "../../../i18n/pageText";
import { useLocale } from "../../../i18n/LocaleProvider";
import { hrText } from "../../text";
import { SignedOut } from "../../../shared/SignedOut";

type Profile = { standing: string; standingReason: string | null };
type Cred = { id: string; credentialType: string; issuer: string | null; expiresAt: string | null; status: string; effectiveStatus: string; supersededById: string | null };
type Case = { id: string; caseType: string; status: string; reason: string | null; createdAt: string };
type Trust = { identity: string; backgroundCheck: string };
type Decision = { allowed: boolean; reasons: string[] };
type Record = { profile: Profile; credentials: Cred[]; cases: Case[]; verification: Trust; eligibility: { expressInterest: Decision; receiveOffer: Decision } };
type Event = { id: string; eventType: string; priorState: string | null; newState: string; reason: string | null; source: string; createdAt: string };

const STANDINGS = ["active", "review_required", "restricted", "suspended", "inactive"] as const;
const RESTRICTIVE = new Set(["restricted", "suspended", "inactive"]);
const CASE_NEXT: Record2 = {
  opened: ["under_review", "closed"],
  under_review: ["action_required", "resolved", "closed"],
  action_required: ["under_review", "resolved", "closed"],
  resolved: ["closed"],
  closed: []
};
type Record2 = { [k: string]: string[] };

type DocRow = { id: string; documentType: string; jurisdiction: string | null; expiresAt: string | null; effectiveStatus: string; reviewReason: string | null; supersededById: string | null; verifiedCertificateKey?: string | null };
const LISTED_CERTIFICATES = REQUIRED_CERTIFICATE_KEYS.filter((key) => key !== "other");
type Compliance = { result: string; reasons: { requirementKey: string; requiredType: string; kind: string; satisfied: boolean; detail: string }[] };

export function HrWorkerPanel({ workerIdentityId }: { workerIdentityId: string }) {
  const ht = usePageText(hrText);
  const t = ht.worker;
  const locale = useLocale();
  // Verify form per document: expiry date and the certificate a generic upload proves.
  const [verifyExpiry, setVerifyExpiry] = useState<{ [id: string]: string }>({});
  const [verifyKey, setVerifyKey] = useState<{ [id: string]: string }>({});
  const [record, setRecord] = useState<Record | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [jurisdiction, setJurisdiction] = useState("CA-QC");
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // standing form
  const [newStanding, setNewStanding] = useState("review_required");
  const [standingReason, setStandingReason] = useState("");
  // credential form
  const [credType, setCredType] = useState("");
  const [credExpiry, setCredExpiry] = useState("");
  // case form
  const [caseType, setCaseType] = useState("");
  const [caseReason, setCaseReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [rec, ev, docs, comp] = await Promise.all([
        fetch(`/api/hr/workers/${encodeURIComponent(workerIdentityId)}`, { cache: "no-store" }),
        fetch(`/api/hr/workers/${encodeURIComponent(workerIdentityId)}/events?limit=50`, { cache: "no-store" }),
        fetch(`/api/hr/workers/${encodeURIComponent(workerIdentityId)}/documents`, { cache: "no-store" }),
        fetch(`/api/hr/workers/${encodeURIComponent(workerIdentityId)}/compliance?jurisdiction=${encodeURIComponent(jurisdiction)}`, { cache: "no-store" })
      ]);
      if (!rec.ok) return setStatus(rec.status === 401 || rec.status === 403 ? "denied" : "unavailable");
      setRecord((await rec.json()) as Record);
      if (ev.ok) setEvents(((await ev.json()).items ?? []) as Event[]);
      if (docs.ok) setDocuments(((await docs.json()).documents ?? []) as DocRow[]);
      if (comp.ok) setCompliance((await comp.json()).compliance as Compliance);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [workerIdentityId, jurisdiction]);

  const docAction = useCallback(async (documentId: string, action: "accept" | "reject" | "revoke", reason?: string, verify?: { expiresAt?: string; certificateKey?: string }) => {
    setBusy(true);
    setNotice(null);
    try {
      const payload = action === "accept"
        ? { ...(verify?.expiresAt ? { expiresAt: new Date(`${verify.expiresAt}T23:59:59`).toISOString() } : {}), ...(verify?.certificateKey ? { certificateKey: verify.certificateKey } : {}) }
        : reason ? { reason } : {};
      const r = await fetch(`/api/hr/documents/${encodeURIComponent(documentId)}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const p = await r.json().catch(() => null) as { message?: string } | null;
        setNotice({ tone: "err", msg: r.status === 409 ? t.docNotReviewable : r.status === 400 && p?.message ? p.message : t.actionFailed });
        return;
      }
      setNotice({ tone: "ok", msg: t.docDone(action) });
      await load();
    } finally {
      setBusy(false);
    }
  }, [load, t]);

  useEffect(() => { void load(); }, [load]);

  const post = useCallback(async (path: string, body: unknown, okMsg: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/hr/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) {
        const p = await r.json().catch(() => null);
        setNotice({ tone: "err", msg: p?.message ?? (r.status === 403 ? t.authorityRequired : t.actionNotCompleted) });
        return false;
      }
      setNotice({ tone: "ok", msg: okMsg });
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }, [load, t]);

  if (status === "loading") return <main style={styles.page}><p aria-live="polite">{t.loading}</p></main>;
  if (status === "denied") return <main style={styles.page}><SignedOut compact /></main>;
  if (status === "unavailable" || !record) return <main style={styles.page}><p role="alert">{t.unavailable} <button style={styles.btn} onClick={() => void load()}>{ht.retry}</button></p></main>;

  const changeStanding = async () => {
    if (RESTRICTIVE.has(newStanding) && !standingReason.trim()) { setNotice({ tone: "err", msg: t.reasonRequired }); return; }
    if (RESTRICTIVE.has(newStanding) && !window.confirm(t.confirmRestrictive(ht.status(newStanding)))) return;
    await post(`workers/${encodeURIComponent(workerIdentityId)}/standing`, { standing: newStanding, reason: standingReason.trim() || undefined }, t.standingUpdated);
    setStandingReason("");
  };

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <a href="/hr" style={styles.back}>{t.back}</a>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.dim}>{t.identity(workerIdentityId)}</p>
      </header>
      {notice ? <p role={notice.tone === "err" ? "alert" : "status"} style={notice.tone === "err" ? styles.err : styles.ok}>{notice.msg}</p> : null}

      {(() => {
        // Advisory profile scan — consolidates what's blocking this worker, from data already loaded.
        // Read-only: does not change standing/eligibility (those stay governed + centrally gated).
        const issues: string[] = [];
        if (!record.eligibility.receiveOffer.allowed) issues.push(...record.eligibility.receiveOffer.reasons.map((r) => t.cannotReceiveOffers(r)));
        if (compliance) issues.push(...compliance.reasons.filter((r) => !r.satisfied).map((r) => t.missing(r.requiredType || r.requirementKey, r.detail)));
        issues.push(...documents.filter((d) => (d.effectiveStatus === "expired" || d.effectiveStatus === "rejected") && !d.supersededById).map((d) => t.documentIs(d.documentType, ht.status(d.effectiveStatus))));
        return (
          <section style={styles.card} aria-label={t.profileIssuesAria}>
            <h2 style={styles.h2}>{t.profileScan} {issues.length > 0 ? t.toResolve(issues.length) : t.allClear} <span style={styles.dim}>{t.advisory}</span></h2>
            {issues.length === 0 ? (
              <p style={styles.dim}>{t.noIssues}</p>
            ) : (
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>{issues.map((it, i) => <li key={i} style={styles.dim}>{it}</li>)}</ul>
            )}
          </section>
        );
      })()}

      <div style={styles.grid}>
        {/* Standing + verification indicators + eligibility impact */}
        <section style={styles.card}>
          <h2 style={styles.h2}>{t.standing}</h2>
          <p><span style={styles.badge}>{ht.status(record.profile.standing)}</span>{record.profile.standingReason ? <span style={styles.dim}> · {record.profile.standingReason}</span> : null}</p>
          <div style={styles.formRow}>
            <select aria-label={t.newStandingAria} value={newStanding} onChange={(e) => setNewStanding(e.target.value)} style={styles.input}>
              {STANDINGS.map((s) => <option key={s} value={s}>{ht.status(s)}</option>)}
            </select>
            <input aria-label={t.reasonAria} placeholder={RESTRICTIVE.has(newStanding) ? t.reasonRequiredPlaceholder : t.reasonOptionalPlaceholder} value={standingReason} onChange={(e) => setStandingReason(e.target.value)} style={styles.input} />
            <button type="button" style={styles.btn} disabled={busy} onClick={() => void changeStanding()}>{t.updateStanding}</button>
          </div>
          <h3 style={styles.h3}>{t.verificationHeading}</h3>
          <div style={styles.chips}>
            <span style={styles.chip}>{t.identityIndicator(record.verification.identity)}</span>
            <span style={styles.chip}>{t.backgroundIndicator(record.verification.backgroundCheck)}</span>
          </div>
          <h3 style={styles.h3}>{t.eligibilityHeading}</h3>
          <p style={styles.dim}>
            {t.expressInterest(record.eligibility.expressInterest.allowed ? t.allowed : t.blocked(record.eligibility.expressInterest.reasons.join(", ")))} ·{" "}
            {t.receiveOffer(record.eligibility.receiveOffer.allowed ? t.allowed : t.blocked(record.eligibility.receiveOffer.reasons.join(", ")))}
          </p>
          <p style={styles.note}>{t.eligibilityNote}</p>
        </section>

        {/* Credentials */}
        <section style={styles.card}>
          <h2 style={styles.h2}>{t.credentials}</h2>
          <ul style={styles.plainList}>
            {record.credentials.length === 0 ? <li style={styles.dim}>{t.noCredentials}</li> : record.credentials.map((c) => (
              <li key={c.id} style={styles.credItem}>
                <div>
                  <strong>{c.credentialType}</strong> <span style={credBadge(c.effectiveStatus)}>{ht.status(c.effectiveStatus)}</span>
                  {c.supersededById ? <span style={styles.dim}> · {t.replaced}</span> : null}
                  <div style={styles.dim}>{c.expiresAt ? ht.expiresOn(new Date(c.expiresAt).toLocaleDateString()) : t.noExpiry}</div>
                </div>
                {!["replaced", "revoked"].includes(c.status) ? (
                  <div style={styles.rowBtns}>
                    <button type="button" style={styles.btnSm} disabled={busy} onClick={() => void post(`credentials/${encodeURIComponent(c.id)}/renew`, { expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() }, t.credentialRenewed)}>{t.renew}</button>
                    <button type="button" style={styles.btnGhostSm} disabled={busy} onClick={() => void post(`credentials/${encodeURIComponent(c.id)}/revoke`, { reason: "revoked by HR" }, t.credentialRevoked)}>{t.revoke}</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div style={styles.formRow}>
            <input aria-label={t.credentialType} placeholder={t.credentialType} value={credType} onChange={(e) => setCredType(e.target.value)} style={styles.input} />
            <input aria-label={t.expiryAria} type="date" value={credExpiry} onChange={(e) => setCredExpiry(e.target.value)} style={styles.input} />
            <button type="button" style={styles.btn} disabled={busy || !credType.trim()} onClick={async () => { if (await post(`workers/${encodeURIComponent(workerIdentityId)}/credentials`, { credentialType: credType.trim(), expiresAt: credExpiry ? new Date(credExpiry).toISOString() : undefined }, t.credentialAdded)) { setCredType(""); setCredExpiry(""); } }}>{t.addCredential}</button>
          </div>
        </section>

        {/* Cases */}
        <section style={styles.card}>
          <h2 style={styles.h2}>{t.cases}</h2>
          <ul style={styles.plainList}>
            {record.cases.length === 0 ? <li style={styles.dim}>{t.noCases}</li> : record.cases.map((k) => (
              <li key={k.id} style={styles.credItem}>
                <div>
                  <strong>{k.caseType}</strong> <span style={styles.badge}>{ht.status(k.status)}</span>
                  {k.reason ? <div style={styles.dim}>{k.reason}</div> : null}
                </div>
                <div style={styles.rowBtns}>
                  {(CASE_NEXT[k.status] ?? []).map((to) => (
                    <button key={to} type="button" style={to === "closed" ? styles.btnGhostSm : styles.btnSm} disabled={busy} onClick={() => void post(`cases/${encodeURIComponent(k.id)}/transition`, { to }, t.caseMoved(ht.status(to)))}>{ht.status(to)}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div style={styles.formRow}>
            <input aria-label={t.caseType} placeholder={t.caseType} value={caseType} onChange={(e) => setCaseType(e.target.value)} style={styles.input} />
            <input aria-label={t.caseReasonAria} placeholder={t.reasonOptionalPlaceholder} value={caseReason} onChange={(e) => setCaseReason(e.target.value)} style={styles.input} />
            <button type="button" style={styles.btn} disabled={busy || !caseType.trim()} onClick={async () => { if (await post(`workers/${encodeURIComponent(workerIdentityId)}/cases`, { caseType: caseType.trim(), reason: caseReason.trim() || undefined }, t.caseOpened)) { setCaseType(""); setCaseReason(""); } }}>{t.openCase}</button>
          </div>
        </section>

        {/* Documents */}
        <section style={styles.card}>
          <h2 style={styles.h2}>{t.documents}</h2>
          <ul style={styles.plainList}>
            {documents.filter((d) => d.effectiveStatus !== "superseded").length === 0 ? <li style={styles.dim}>{t.noDocuments}</li> : documents.filter((d) => d.effectiveStatus !== "superseded").map((d) => (
              <li key={d.id} style={styles.credItem}>
                <div>
                  <strong>{d.documentType}</strong> <span style={docBadge(d.effectiveStatus)}>{ht.status(d.effectiveStatus)}</span>
                  {d.jurisdiction ? <span style={styles.dim}> · {d.jurisdiction}</span> : null}
                  <div style={styles.dim}>{d.expiresAt ? ht.expiresOn(new Date(d.expiresAt).toLocaleDateString()) : t.noExpiry}{d.reviewReason ? ` · ${d.reviewReason}` : ""}</div>
                  {(() => {
                    const proves = d.verifiedCertificateKey ?? certificateKeyForDocumentType(d.documentType);
                    return proves && proves !== "other" && d.effectiveStatus === "accepted"
                      ? <div style={styles.dim}>{t.verifiedAs(certificateLabel(proves as RequiredCertificateKey, locale))}</div>
                      : null;
                  })()}
                  {["submitted", "under_review"].includes(d.effectiveStatus) ? (
                    <div style={styles.formRow}>
                      <label style={styles.dim}>
                        {t.verifyExpiry}{" "}
                        <input type="date" value={verifyExpiry[d.id] ?? ""} onChange={(e) => setVerifyExpiry((v) => ({ ...v, [d.id]: e.target.value }))} style={styles.input} />
                      </label>
                      {certificateKeyForDocumentType(d.documentType) === null ? (
                        <label style={styles.dim}>
                          {t.verifyCertificate}{" "}
                          <select value={verifyKey[d.id] ?? ""} onChange={(e) => setVerifyKey((v) => ({ ...v, [d.id]: e.target.value }))} style={styles.input}>
                            <option value="">{t.verifyCertificateNone}</option>
                            {LISTED_CERTIFICATES.map((key) => <option key={key} value={key}>{certificateLabel(key, locale)}</option>)}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div style={styles.rowBtns}>
                  {["submitted", "under_review"].includes(d.effectiveStatus) ? (
                    <>
                      <button type="button" style={styles.btnSm} disabled={busy} onClick={() => void docAction(d.id, "accept", undefined, { ...(verifyExpiry[d.id] ? { expiresAt: verifyExpiry[d.id] } : {}), ...(verifyKey[d.id] ? { certificateKey: verifyKey[d.id] } : {}) })}>{t.accept}</button>
                      <button type="button" style={styles.btnGhostSm} disabled={busy} onClick={() => { const r = window.prompt(t.rejectPrompt); if (r) void docAction(d.id, "reject", r); }}>{t.reject}</button>
                    </>
                  ) : null}
                  {d.effectiveStatus === "accepted" ? <button type="button" style={styles.btnGhostSm} disabled={busy} onClick={() => { const r = window.prompt(t.revokePrompt); if (r) void docAction(d.id, "revoke", r); }}>{t.revoke}</button> : null}
                </div>
              </li>
            ))}
          </ul>
          <p style={styles.note}>{t.verifyHelp}</p>
          <p style={styles.note}>{t.documentsNote}</p>
        </section>

        {/* Compliance */}
        <section style={styles.card}>
          <h2 style={styles.h2}>{t.compliance}</h2>
          <div style={styles.formRow}>
            <input aria-label={t.jurisdictionAria} value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} style={styles.input} placeholder={t.jurisdictionPlaceholder} />
            <button type="button" style={styles.btnSm} onClick={() => void load()}>{t.reevaluate}</button>
          </div>
          {compliance ? (
            <>
              <p><span style={complianceBadge(compliance.result)}>{ht.status(compliance.result)}</span></p>
              <ul style={styles.plainList}>
                {compliance.reasons.length === 0 ? <li style={styles.dim}>{t.noRequirements}</li> : compliance.reasons.map((r, i) => (
                  <li key={i} style={styles.timelineItem}>
                    <strong>{r.requiredType}</strong> ({r.kind}) — {r.satisfied ? t.satisfied : t.notSatisfied} · <span style={styles.dim}>{r.detail}</span>
                  </li>
                ))}
              </ul>
              <p style={styles.note}>{t.complianceNote}</p>
            </>
          ) : <p style={styles.dim}>{t.noEvaluation}</p>}
        </section>

        {/* Timeline */}
        <section style={styles.card}>
          <h2 style={styles.h2}>{t.audit}</h2>
          <ul style={styles.plainList}>
            {events.length === 0 ? <li style={styles.dim}>{t.noEvents}</li> : events.map((e) => (
              <li key={e.id} style={styles.timelineItem}>
                <strong>{e.eventType.replaceAll("_", " ")}</strong> {e.priorState ? `${e.priorState} → ` : ""}{e.newState}
                <span style={styles.dim}> · {e.source} · {new Date(e.createdAt).toLocaleString()}{e.reason ? ` · ${e.reason}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function credBadge(status: string): React.CSSProperties {
  if (status === "expired" || status === "revoked") return { ...styles.badge, background: "#fee2e2", color: "#b91c1c" };
  if (status === "expiring") return { ...styles.badge, background: "#0c0c0c", color: "#b3a894" };
  if (status === "replaced") return { ...styles.badge, background: "#000000", color: "#f4efe4" };
  return { ...styles.badge, background: "#dcfce7", color: "#15803d" };
}
function docBadge(status: string): React.CSSProperties {
  if (status === "accepted") return { ...styles.badge, background: "#dcfce7", color: "#15803d" };
  if (status === "expiring" || status === "submitted" || status === "under_review") return { ...styles.badge, background: "#0c0c0c", color: "#b3a894" };
  if (status === "expired" || status === "rejected" || status === "revoked") return { ...styles.badge, background: "#fee2e2", color: "#b91c1c" };
  return { ...styles.badge, background: "#000000", color: "#f4efe4" };
}
function complianceBadge(result: string): React.CSSProperties {
  if (result === "compliant") return { ...styles.badge, background: "#dcfce7", color: "#15803d" };
  if (result === "expiring_soon" || result === "review_required") return { ...styles.badge, background: "#0c0c0c", color: "#b3a894" };
  return { ...styles.badge, background: "#fee2e2", color: "#b91c1c" };
}

const styles: Record2Style = {
  page: { padding: "clamp(16px, 3vw, 32px)", fontFamily: "Inter, system-ui, sans-serif", color: "#f4efe4" },
  hero: { marginBottom: 12 },
  back: { color: "#f4efe4", textDecoration: "none", fontWeight: 600, fontSize: 13 },
  title: { fontSize: "clamp(22px, 3.5vw, 30px)", margin: "6px 0 2px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  card: { border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 12, padding: 16, background: "#0c0c0c", display: "flex", flexDirection: "column", gap: 8 },
  h2: { fontSize: 16, margin: 0 },
  h3: { fontSize: 13, margin: "8px 0 2px", color: "#f4efe4" },
  formRow: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  input: { border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, padding: "8px 10px", fontSize: 14, minHeight: 38 },
  plainList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  credItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, borderBottom: "1px solid rgba(248, 184, 8, 0.16)", paddingBottom: 8 },
  timelineItem: { fontSize: 13, borderBottom: "1px solid rgba(248, 184, 8, 0.16)", paddingBottom: 6 },
  rowBtns: { display: "flex", gap: 6, flexShrink: 0 },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  badge: { borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700, background: "#000000", color: "#f4efe4" },
  dim: { color: "#ece3d2", fontSize: 12 },
  note: { color: "#b3a894", fontSize: 12, margin: 0 },
  btn: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSm: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnGhostSm: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  ok: { color: "#15803d", fontSize: 13 },
  err: { color: "#b91c1c", fontSize: 13 }
};
type Record2Style = { [k: string]: React.CSSProperties };
