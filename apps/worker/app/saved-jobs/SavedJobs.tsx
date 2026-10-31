"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "../MarketplaceExplorer";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import { resolveDeniedKind } from "../resolveDenied";

type SavedEntry = Readonly<{
  jobRequestId: string;
  savedAt: string;
  available: boolean;
  summary: {
    role: string;
    title: string;
    employer: { id: string; name: string; verified: boolean };
    areaLabel: string | null;
    startAt: string;
    endAt: string;
    openings: number;
  } | null;
}>;

export function SavedJobs() {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "needs_setup" | "error">("loading");
  const [entries, setEntries] = useState<SavedEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/saved-jobs", { cache: "no-store" });
      if (r.status === 401) return setStatus(await resolveDeniedKind());
      if (!r.ok) return setStatus("error");
      const payload = (await r.json()) as { saved: SavedEntry[] };
      setEntries(payload.saved);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(async (jobRequestId: string) => {
    const prev = entries;
    setEntries((current) => current.filter((e) => e.jobRequestId !== jobRequestId));
    try {
      const r = await fetch(`/api/saved-jobs/${encodeURIComponent(jobRequestId)}`, { method: "DELETE" });
      if (!r.ok) throw new Error("remove failed");
    } catch {
      setEntries(prev); // revert on failure
    }
  }, [entries]);

  if (status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (status === "signed_out")
    return (
      <div className="state">
        {t("saved.signInPrompt")}
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
          <a className="btn" href="/pay">{t("common.setUpWorker")}</a>
        </div>
      </div>
    );
  if (status === "error") return <div className="state error" role="alert">{t("saved.loadError")}</div>;

  return (
    <>
      <section className="hero">
        <h1>{t("nav.savedJobs")}</h1>
        <p>{entries.length === 0 ? t("saved.none") : t("saved.countSaved", { count: entries.length })}</p>
      </section>

      {entries.length === 0 ? (
        <div className="state">
          {t("saved.appearHere")}
          <div style={{ marginTop: 12 }}>
            <a className="btn" href="/">{t("common.findJobs")}</a>
          </div>
        </div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {entries.map((e) => (
            <article key={e.jobRequestId} className={`card${e.available ? "" : " unavailable"}`}>
              <button
                className="save"
                type="button"
                aria-pressed
                aria-label={t("mk.removeSavedAria", { role: e.summary?.role ?? t("common.aJob") })}
                title={t("saved.remove")}
                onClick={() => remove(e.jobRequestId)}
              >
                ★
              </button>
              {e.summary ? (
                <>
                  {e.available ? (
                    <a className="role cardlink" href={`/jobs/${encodeURIComponent(e.jobRequestId)}`}>
                      {e.summary.role}
                    </a>
                  ) : (
                    <div className="role">{e.summary.role}</div>
                  )}
                  <div className="employer">{e.summary.employer.name}</div>
                  <div className="chips">
                    {e.summary.areaLabel ? <span className="chip">{e.summary.areaLabel}</span> : null}
                    <span className="chip">
                      {e.summary.openings === 1 ? t("mk.openingOne", { count: e.summary.openings }) : t("mk.openingMany", { count: e.summary.openings })}
                    </span>
                  </div>
                  <div className="when">{formatWhen(e.summary.startAt, e.summary.endAt, locale)}</div>
                  {!e.available ? <div className="chip" style={{ color: "var(--danger)" }}>{t("saved.noLongerAvailableChip")}</div> : null}
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
