"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "../MarketplaceExplorer";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";

type InterestItem = Readonly<{
  jobRequestId: string;
  status: string;
  createdAt: string;
  offerStatus: string | null;
  summary: {
    role: string;
    title: string;
    employer: { id: string; name: string };
    areaLabel: string | null;
    startAt: string;
    endAt: string;
  } | null;
}>;

// Marketplace-intent status → worker-facing label key. Kept visually distinct from offer state.
const INTEREST_LABEL_KEY: Record<string, MessageKey> = {
  submitted: "interests.submitted",
  under_review: "interests.underReview",
  shortlisted: "interests.shortlisted",
  not_selected: "interests.notSelected",
  withdrawn: "interests.withdrawn",
  offer_created: "interests.offerCreated",
  offer_accepted: "interests.offerAccepted"
};

export function MyInterests() {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "needs_setup" | "error">("loading");
  const [items, setItems] = useState<InterestItem[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/my-interests", { cache: "no-store" });
      // The BFF collapses the API's 403 ("not a worker yet") into a 401. A signed-in account that
      // simply isn't set up as a worker is NOT signed out — disambiguate against the real session.
      if (r.status === 401) {
        try {
          const s = await fetch("/api/session", { cache: "no-store" });
          const j = s.ok ? ((await s.json()) as { authenticated?: boolean }) : null;
          return setStatus(j?.authenticated ? "needs_setup" : "signed_out");
        } catch {
          return setStatus("signed_out");
        }
      }
      if (!r.ok) return setStatus("error");
      const payload = (await r.json()) as { interests: InterestItem[] };
      setItems(payload.interests);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (status === "signed_out")
    return (
      <div className="state">
        {t("interests.signInPrompt")}
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/">{t("common.goToSearch")}</a>
        </div>
      </div>
    );
  if (status === "needs_setup")
    return (
      <div className="state">
        {t("common.needsWorkerSetup")}
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/onboarding">{t("common.setUpWorker")}</a>
        </div>
      </div>
    );
  if (status === "error") return <div className="state error" role="alert">{t("interests.loadError")}</div>;

  const activeCount = items.filter((i) => !["withdrawn", "not_selected"].includes(i.status)).length;

  return (
    <>
      <section className="hero">
        <h1>{t("nav.interests")}</h1>
        <p>{items.length === 0 ? t("interests.none") : t("interests.countActive", { count: activeCount })}</p>
      </section>

      {items.length === 0 ? (
        <div className="state">
          {t("interests.appearHere")}
          <div style={{ marginTop: 12 }}>
            <a className="btn" href="/">{t("common.findJobs")}</a>
          </div>
        </div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {items.map((i) => (
            <article key={`${i.jobRequestId}-${i.createdAt}`} className="card">
              {i.summary ? (
                <>
                  <a className="role cardlink" href={`/jobs/${encodeURIComponent(i.jobRequestId)}`}>
                    {i.summary.role}
                  </a>
                  <div className="employer">{i.summary.employer.name}</div>
                  <div className="chips">
                    <span className={`chip status-${i.status}`}>{t(INTEREST_LABEL_KEY[i.status] ?? "interests.submitted")}</span>
                    {i.offerStatus ? <span className="chip offer">{t("interests.offerChip", { status: i.offerStatus })}</span> : null}
                    {i.summary.areaLabel ? <span className="chip">{i.summary.areaLabel}</span> : null}
                  </div>
                  <div className="when">{formatWhen(i.summary.startAt, i.summary.endAt, locale)}</div>
                </>
              ) : (
                <div className="role muted">{t("job.noLongerAvailable")}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
