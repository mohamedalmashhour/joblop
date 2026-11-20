"use client";

import { useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { hrText } from "./text";

type Demand = Readonly<{ key: string; label: string; workers: number }>;
type Person = Readonly<{ workerIdentityId: string; displayName: string | null }>;

// Which kinds of work workers want, and who wants each one.
export function JobInterestPanel({ style }: { style: Record<string, React.CSSProperties | undefined> }) {
  const t = usePageText(hrText);
  const [demand, setDemand] = useState<readonly Demand[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [people, setPeople] = useState<readonly Person[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/hr/job-categories", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((p: { categories: Demand[] }) => setDemand(p.categories))
      .catch(() => setFailed(true));
  }, []);

  const show = async (key: string) => {
    setOpen(key);
    setPeople([]);
    const r = await fetch(`/api/hr/job-categories/${encodeURIComponent(key)}/workers`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return setFailed(true);
    setPeople(((await r.json()) as { workers: Person[] }).workers);
  };

  if (failed) return <p style={style.notice}>{t.interestsUnavailable}</p>;
  if (!demand) return <p style={style.notice}>{t.loading}</p>;

  return (
    <section aria-label={t.interestsAria}>
      <table style={{ borderCollapse: "collapse", width: "100%", color: "inherit" }}>
        <thead><tr><th scope="col" style={{ textAlign: "left", padding: 8 }}>{t.categoryHeader}</th><th scope="col" style={{ textAlign: "right", padding: 8 }}>{t.workersHeader}</th><th scope="col" /></tr></thead>
        <tbody>
          {demand.map((d) => (
            <tr key={d.key}>
              <td style={{ padding: 8 }}>{d.label}</td>
              <td style={{ padding: 8, textAlign: "right" }}>{d.workers}</td>
              <td style={{ padding: 8, textAlign: "right" }}>
                <button type="button" disabled={d.workers === 0} style={style.tab} onClick={() => void show(d.key)}>{t.view}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {open ? (
        <ul>
          {people.map((p) => <li key={p.workerIdentityId}><a href={`/hr/workers/${p.workerIdentityId}`} style={{ color: "inherit" }}>{p.displayName ?? t.unnamedWorker}</a></li>)}
        </ul>
      ) : null}
    </section>
  );
}
