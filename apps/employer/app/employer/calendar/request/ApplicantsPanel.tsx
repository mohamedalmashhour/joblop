"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "../../../i18n/LocaleProvider";
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
type State = { status: "loading" } | { status: "error" } | { status: "ready"; applicants: readonly Applicant[] };

// Who is interested in this job. A favourite is a suggestion to Joblop staff, who send the offers.
export function ApplicantsPanel({ requestId }: { requestId: string }) {
  const t = useT();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const base = `/api/job-requests/${encodeURIComponent(requestId)}/applicants`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(base, { cache: "no-store" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { applicants?: Applicant[] };
      setState({ status: "ready", applicants: payload.applicants ?? [] });
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

  if (state.status === "loading") return null;
  if (state.status === "error") return <p style={styles.cardText}>{t("applicants.loadError")}</p>;

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
