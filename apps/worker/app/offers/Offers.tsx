"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocale, useT, fmtLocale, type Translate } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";

type Offer = Readonly<{
  workerOfferId: string;
  jobRequestId: string;
  status: string;
  expiresAt: string;
  title: string | null;
  summary: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  compensationSummary: string | null;
  policySummary: string | null;
  termsVersionId: string | null;
  versionToken: number;
}>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "needs_setup" }
  | { status: "error" }
  | { status: "ready"; items: readonly Offer[] };

// The BFF collapses the API's 403 ("not a worker yet") into a 401. Disambiguate against the
// real session: a signed-in account that is simply not set up as a worker is NOT signed out.
async function resolveDenied(): Promise<State> {
  try {
    const s = await fetch("/api/session", { cache: "no-store" });
    if (s.ok) {
      const j = (await s.json()) as { authenticated?: boolean };
      if (j?.authenticated) return { status: "needs_setup" };
    }
  } catch { /* fall through to signed_out */ }
  return { status: "signed_out" };
}

// Statuses where the worker can still respond. Terminal states (accepted/declined/expired/
// withdrawn/cancelled) are read-only. `draft`/`approved` are pre-delivery and never worker-visible.
const RESPONDABLE = new Set(["sent", "delivered", "viewed"]);

// Local day key for grouping offers onto calendar cells.
function dayKey(d: Date): string { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
const STATUS_LABEL_KEY: Record<string, MessageKey> = {
  draft: "offers.statusPreparing",
  approved: "offers.statusPreparing",
  sent: "offers.statusAwaiting",
  delivered: "offers.statusAwaiting",
  viewed: "offers.statusAwaiting",
  accepted: "offers.statusAccepted",
  declined: "offers.statusDeclined",
  expired: "offers.statusExpired",
  withdrawn: "offers.statusWithdrawn",
  cancelled: "offers.statusCancelled"
};
const STATUS_CHIP: Record<string, string> = {
  accepted: "status-verified",
  declined: "status-rejected",
  expired: "status-rejected",
  withdrawn: "status-rejected",
  cancelled: "status-rejected"
};

function when(startAt: string | null, endAt: string | null, tz: string | null, locale: RwosLocale, tbc: string): string {
  if (!startAt || !endAt) return tbc;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", ...(tz ? { timeZone: tz } : {})
  };
  return `${new Date(startAt).toLocaleString(locale, opts)} – ${new Date(endAt).toLocaleString(locale, opts)}`;
}
function expiryWhen(expiresAt: string, locale: RwosLocale): string {
  return new Date(expiresAt).toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function Offers() {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  // R2-8b: list / calendar view of offers. The calendar lets the worker see offered shifts by day and
  // accept them right there (same accept/decline as the list, just filtered to the selected day).
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/offers", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState(await resolveDenied());
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { workerOffers: Offer[] };
      setState({ status: "ready", items: payload.workerOffers ?? [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = useCallback(async (offer: Offer, action: "accept" | "decline") => {
    setBusyId(offer.workerOfferId);
    setNotice("");
    try {
      const r = await fetch(`/api/offers/${encodeURIComponent(offer.workerOfferId)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: offer.versionToken, expectedTermsVersionId: offer.termsVersionId ?? "" })
      });
      if (r.status === 409) {
        setNotice(t("offers.changed"));
        await load();
        return;
      }
      if (r.status === 401) return setState(await resolveDenied());
      if (!r.ok) {
        setNotice(t("offers.responseFailed"));
        return;
      }
      setNotice(action === "accept" ? t("offers.accepted") : t("offers.declined"));
      await load();
    } catch {
      setNotice(t("offers.responseFailed"));
    } finally {
      setBusyId(null);
    }
  }, [load, t]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out")
    return <div className="state">{t("offers.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "needs_setup")
    return <div className="state">{t("common.needsWorkerSetup")}<div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("offers.loadError")}</div>;

  const renderOffer = (o: Offer) => {
    const respondable = RESPONDABLE.has(o.status);
    const busy = busyId === o.workerOfferId;
    return (
              <article className="card" key={o.workerOfferId}>
                <div className="role">{o.title ?? t("offers.shiftOffer")}</div>
                <div className="chips">
                  <span className={`chip ${STATUS_CHIP[o.status] ?? "status-pending"}`}>{t(STATUS_LABEL_KEY[o.status] ?? "offers.statusPreparing")}</span>
                </div>
                <dl className="agreement">
                  <dt>{t("offers.agreementTitle")}</dt>
                  {o.summary ? (<><dt>{t("offers.whatYoullDo")}</dt><dd>{o.summary}</dd></>) : null}
                  <dt>{t("offers.scheduleLabel")}</dt>
                  <dd>{when(o.startAt, o.endAt, o.timezone, locale, t("offers.scheduleTbc"))}</dd>
                  {o.compensationSummary ? (<><dt>{t("offers.compensationLabel")}</dt><dd>{o.compensationSummary}</dd></>) : null}
                  {o.policySummary ? (<><dt>{t("offers.policyLabel")}</dt><dd>{o.policySummary}</dd></>) : null}
                  <dt>{t("offers.respondBy")}</dt>
                  <dd>{expiryWhen(o.expiresAt, locale)}</dd>
                </dl>
                {respondable ? (
                  <aside className="rights" aria-label={t("offers.rightsTitle")}>
                    <strong>{t("offers.rightsTitle")}</strong>
                    <ul>
                      <li>{t("offers.rightBinding")}</li>
                      <li>{t("offers.rightNoFee")}</li>
                      <li>{t("offers.rightRecorded")}</li>
                    </ul>
                    <p className="rights-note">{t("offers.allowancesNote")}</p>
                  </aside>
                ) : null}
                {respondable ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn" type="button" disabled={busy} onClick={() => void respond(o, "accept")}>
                      {busy ? t("offers.working") : t("offers.acceptOffer")}
                    </button>
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => void respond(o, "decline")}>
                      {t("offers.decline")}
                    </button>
                    <a className="btn ghost" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>{t("offers.viewJob")}</a>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <a className="btn ghost" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>{t("offers.viewJob")}</a>
                  </div>
                )}
              </article>
    );
  };

  return (
    <>
      <section className="hero">
        <h1>{t("nav.offers")}</h1>
        <p>{t("offers.intro")}</p>
      </section>
      {notice ? <div className="state" role="status" style={{ marginBottom: 16 }}>{notice}</div> : null}

      {state.items.length === 0 ? (
        <div className="state">{t("offers.none")}</div>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 12 }}>
            <button type="button" className={`chip ${view === "list" ? "status-verified" : ""}`} onClick={() => setView("list")}>{t("sched.viewList")}</button>
            <button type="button" className={`chip ${view === "calendar" ? "status-verified" : ""}`} onClick={() => setView("calendar")}>{t("sched.viewCalendar")}</button>
          </div>
          {view === "list" ? (
            <div className="results" style={{ paddingBottom: 48 }}>{state.items.map(renderOffer)}</div>
          ) : (
            <OffersCalendar
              items={state.items}
              month={month}
              onPrev={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNext={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              selected={selectedDay}
              onSelect={setSelectedDay}
              locale={locale}
              t={t}
              renderOffer={renderOffer}
            />
          )}
        </>
      )}
      <p className="notice">{t("offers.footer")}</p>
    </>
  );
}

function OffersCalendar({ items, month, onPrev, onNext, selected, onSelect, locale, t, renderOffer }: {
  items: readonly Offer[];
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  selected: string | null;
  onSelect: (k: string | null) => void;
  locale: RwosLocale;
  t: Translate;
  renderOffer: (o: Offer) => ReactNode;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const startWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const counts = new Map<string, number>();
  for (const o of items) {
    if (!o.startAt) continue;
    const d = new Date(o.startAt);
    if (d.getFullYear() === year && d.getMonth() === m) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
  }
  const monthLabel = new Date(year, m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "narrow" }));
  const cells: (number | null)[] = [...Array<null>(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = dayKey(new Date());
  const dayOffers = selected ? items.filter((o) => o.startAt && dayKey(new Date(o.startAt)) === selected) : [];
  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="chips" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="chip" onClick={onPrev} aria-label={t("sched.prevMonth")}>&#8249;</button>
          <div className="role">{monthLabel}</div>
          <button type="button" className="chip" onClick={onNext} aria-label={t("sched.nextMonth")}>&#8250;</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 10 }}>
          {weekdays.map((w, i) => <div key={`wd-${i}`} style={{ textAlign: "center", fontSize: 12, opacity: 0.7 }}>{w}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b-${i}`} />;
            const k = `${year}-${m}-${day}`;
            const count = counts.get(k) ?? 0;
            const isToday = k === todayKey;
            const isSel = k === selected;
            return (
              <button
                key={`d-${day}`}
                type="button"
                onClick={() => onSelect(isSel ? null : k)}
                style={{
                  aspectRatio: "1 / 1", borderRadius: 8,
                  border: isToday ? "2px solid var(--accent)" : "1px solid var(--border, rgba(127,127,127,0.3))",
                  background: isSel ? "var(--accent)" : count > 0 ? "var(--accent-soft, rgba(127,127,127,0.12))" : "transparent",
                  color: isSel ? "#fff" : "inherit", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 13
                }}
              >
                <span>{day}</span>
                {count > 0 ? <span style={{ fontSize: 10, marginTop: 2 }}>&#9679;{count > 1 ? ` ${count}` : ""}</span> : null}
              </button>
            );
          })}
        </div>
      </section>
      {selected ? (
        dayOffers.length > 0 ? (
          <div className="results" style={{ paddingBottom: 48 }}>{dayOffers.map(renderOffer)}</div>
        ) : (
          <div className="state">{t("sched.noShiftsDay")}</div>
        )
      ) : (
        <p className="notice">{t("sched.pickDay")}</p>
      )}
    </>
  );
}
