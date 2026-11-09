"use client";

import { useCallback, useEffect, useState } from "react";
import { certificateLabel, isRequiredCertificateKey } from "@rwos/shared";
import { useLocale, useT } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/messages";
import { styles } from "../../employerStyles";

type Applicant = Readonly<{
  interestId: string;
  firstName: string | null;
  verified: boolean;
  completedShifts: number;
  status: "interested" | "shortlisted" | "offer_sent" | "assigned" | "not_selected";
  favorite: boolean;
}>;
// Long-term job: the employer chooses (contact details only after Contact / Hire).
type LongTermApplicant = Readonly<{
  interestId: string;
  firstName: string | null;
  city: string | null;
  verified: boolean;
  certificates: readonly string[];
  profileSummary: string | null;
  decision: "shortlisted" | "hired" | "not_selected" | null;
  contact: Readonly<{ email: string | null; phone: string | null }> | null;
}>;
type LongTermAction = "contact" | "shortlist" | "hire" | "not_selected";
type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; applicants: readonly Applicant[] }
  | { status: "long_term"; applicants: readonly LongTermApplicant[] };

// Who is interested in this job. A favourite is a suggestion to Joblop staff, who send the offers.
export function ApplicantsPanel({ requestId }: { requestId: string }) {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const base = `/api/job-requests/${encodeURIComponent(requestId)}/applicants`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(base, { cache: "no-store" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { longTerm?: boolean; applicants?: unknown[] };
      if (payload.longTerm) setState({ status: "long_term", applicants: (payload.applicants ?? []) as LongTermApplicant[] });
      else setState({ status: "ready", applicants: (payload.applicants ?? []) as Applicant[] });
    } catch {
      setState({ status: "error" });
    }
  }, [base]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(applicant: Applicant) {
    setBusy(applicant.interestId);
    setMessage("");
    try {
      const response = await fetch(`${base}/${encodeURIComponent(applicant.interestId)}/favorite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ favorite: !applicant.favorite })
      });
      if (!response.ok) return setMessage(t("applicants.saveError"));
      await load();
    } catch {
      setMessage(t("applicants.saveError"));
    } finally {
      setBusy(null);
    }
  }

  async function decide(applicant: LongTermApplicant, action: LongTermAction) {
    setBusy(applicant.interestId);
    setMessage("");
    try {
      const response = await fetch(`${base}/${encodeURIComponent(applicant.interestId)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!response.ok) return setMessage(t("applicants.saveError"));
      await load();
    } catch {
      setMessage(t("applicants.saveError"));
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") return null;
  if (state.status === "error") return <p style={styles.cardText}>{t("applicants.loadError")}</p>;
  if (state.status === "long_term") {
    return (
      <section style={{ marginTop: 18 }}>
        <h3 style={styles.cardTitle}>{t("applicants.ltTitle")}</h3>
        <p style={styles.cardText}>{t("applicants.ltNote")}</p>
        {state.applicants.length === 0 ? <p style={styles.cardText}>{t("applicants.ltNone")}</p> : null}
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {state.applicants.map((applicant) => {
            const certs = applicant.certificates.filter(isRequiredCertificateKey).map((key) => certificateLabel(key, locale));
            return (
              <article key={applicant.interestId} style={{ ...styles.tintedCard, display: "grid", gap: 6 }}>
                <strong style={styles.cardTitle}>
                  {applicant.firstName ?? t("applicants.unnamed")}
                  {applicant.verified ? ` · ${t("applicants.verified")}` : ""}
                  {applicant.decision ? ` · ${t(`applicants.ltDecision_${applicant.decision}` as MessageKey)}` : ""}
                </strong>
                {applicant.city ? <span style={styles.cardText}>{t("applicants.ltCity", { city: applicant.city })}</span> : null}
                <span style={styles.cardText}>{certs.length > 0 ? t("applicants.ltCerts", { list: certs.join(", ") }) : t("applicants.ltNoCerts")}</span>
                {applicant.profileSummary ? <span style={styles.cardText}>{applicant.profileSummary}</span> : null}
                {applicant.contact ? (
                  <span style={styles.cardText}>
                    {applicant.contact.email ? t("applicants.ltEmail", { email: applicant.contact.email }) : null}
                    {applicant.contact.email && applicant.contact.phone ? " · " : null}
                    {applicant.contact.phone ? t("applicants.ltPhone", { phone: applicant.contact.phone }) : null}
                  </span>
                ) : null}
                {applicant.decision === "hired" ? null : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {applicant.contact ? null : (
                      <button disabled={busy !== null} onClick={() => void decide(applicant, "contact")} style={styles.secondaryButton} type="button">{t("applicants.ltContact")}</button>
                    )}
                    {applicant.decision === "shortlisted" ? null : (
                      <button disabled={busy !== null} onClick={() => void decide(applicant, "shortlist")} style={styles.secondaryButton} type="button">{t("applicants.ltShortlist")}</button>
                    )}
                    <button disabled={busy !== null} onClick={() => void decide(applicant, "hire")} style={styles.primaryButton} type="button">{t("applicants.ltHire")}</button>
                    {applicant.decision === "not_selected" ? null : (
                      <button disabled={busy !== null} onClick={() => void decide(applicant, "not_selected")} style={styles.secondaryButton} type="button">{t("applicants.ltNotSelected")}</button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <p aria-live="polite" role="status" style={styles.cardText}>{message}</p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={styles.cardTitle}>{t("applicants.title")}</h3>
      <p style={styles.cardText}>{t("applicants.note")}</p>
      {state.applicants.length === 0 ? <p style={styles.cardText}>{t("applicants.none")}</p> : null}
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {state.applicants.map((applicant) => (
          <article key={applicant.interestId} style={{ ...styles.tintedCard, alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={styles.cardTitle}>{applicant.firstName ?? t("applicants.unnamed")}</strong>
              <span style={styles.cardText}>
                {t(`applicants.status_${applicant.status}` as MessageKey)}
                {" · "}
                {t("applicants.shifts", { count: String(applicant.completedShifts) })}
                {applicant.verified ? ` · ${t("applicants.verified")}` : ""}
              </span>
            </div>
            {applicant.status === "not_selected" ? null : (
              <button
                aria-pressed={applicant.favorite}
                disabled={busy !== null}
                onClick={() => void toggle(applicant)}
                style={applicant.favorite ? styles.primaryButton : styles.secondaryButton}
                type="button"
              >
                {applicant.favorite ? `★ ${t("applicants.favorited")}` : `☆ ${t("applicants.favorite")}`}
              </button>
            )}
          </article>
        ))}
      </div>
      <p aria-live="polite" role="status" style={styles.cardText}>{message}</p>
    </section>
  );
}
