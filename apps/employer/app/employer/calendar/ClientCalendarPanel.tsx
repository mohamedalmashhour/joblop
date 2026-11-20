"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  clearWebCalendarSession,
  formatRwosDateTime,
  parseClientCalendarList,
  type AuthenticatedViewState,
  type ClientCalendarDto
} from "@rwos/shared";
import { styles } from "../employerStyles";
import { fmtLocale, useLocale, useT } from "../../i18n/LocaleProvider";
import { RequestStatusChip } from "../RequestStatusChip";
import { requestPhase, requestPhaseLabel, requestPhaseTone } from "../requestStatus";
import { mondayFirstCells, mondayFirstWeekdays, requestDayKey, sortRequestsForList } from "./requestCalendarGrid";
import { langOf } from "../../i18n/localText";
import { calendarStateText } from "../recordListText";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type ClientCalendarState =
  | AuthenticatedViewState<readonly ClientCalendarDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

export function ClientCalendarPanel() {
  const tx = calendarStateText[langOf(useLocale())];
  const [state, setState] = useState<ClientCalendarState>({
    status: "loading"
  });
  // Align with the admin/worker calendars: a month-grid view by default, with the original card
  // list still available via the toggle. Both hooks live before any early return (rules of hooks).
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/calendar/requests", { cache: "no-store" });
      if (generation !== requestGeneration.current) return;
      if (response.status === 409) {
        const context = parseOrganizationContext(await response.json().catch(() => null));
        if (generation !== requestGeneration.current) return;
        if (context) return setState(context);
      }
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = await response.json();
      if (generation === requestGeneration.current) {
        setState(calendarListState(parseClientCalendarList(payload)));
      }
    } catch {
      if (generation === requestGeneration.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  if (state.status === "loading")
    return (
      <CalendarState
        title={tx.loading}
        message={tx.loadingBody}
      />
    );
  if (state.status === "denied") return <ClientSignIn />;
  if (state.status === "organization_required") {
    return (
      <>
        <SessionAction onSignedOut={load} />
        <OrganizationPicker organizations={state.organizations} onSelected={load} />
      </>
    );
  }
  if (state.status === "empty")
    return (
      <>
        <SessionAction onSignedOut={load} />
        <CalendarState
          title={tx.emptyTitle}
          message={tx.emptyBody}
          action="/employer/calendar/create"
        />
      </>
    );
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <CalendarState
        title={
          state.status === "unavailable"
            ? tx.unavailableTitle
            : state.status === "stale"
              ? tx.changedTitle
              : tx.errorTitle
        }
        message={tx.errorBody}
        onRetry={load}
      />
    );
  }

  return (
    <>
      <SessionAction onSignedOut={load} />
      {state.status === "partial" ? (
        <CalendarState
          title={tx.partialTitle}
          message={tx.partialBody}
          onRetry={load}
        />
      ) : null}
      <div style={gridStyles.toggleRow}>
        <button
          type="button"
          onClick={() => setView("calendar")}
          style={view === "calendar" ? gridStyles.toggleActive : gridStyles.toggle}
        >
          {tx.viewCalendar}
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          style={view === "list" ? gridStyles.toggleActive : gridStyles.toggle}
        >
          {tx.viewList}
        </button>
      </div>
      {view === "calendar" ? (
        <ClientCalendarGrid
          requests={state.data}
          month={month}
          onPrev={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          onNext={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        />
      ) : (
        <div style={styles.cardGrid}>
          {sortRequestsForList(state.data, Date.now()).map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </>
  );
}

const MAX_CHIPS_PER_DAY = 3;

// Month-grid calendar for the client's requests, aligned with the admin and worker calendars: each
// request sits on its shift date, coloured by status, and busy days collapse to "+N more".
function ClientCalendarGrid({
  requests,
  month,
  onPrev,
  onNext
}: Readonly<{
  requests: readonly ClientCalendarDto[];
  month: Date;
  onPrev: () => void;
  onNext: () => void;
}>) {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const statusText = (request: ClientCalendarDto) => {
    const label = requestPhaseLabel(requestPhase(request), request.numberOfWorkers);
    return t(label.key, label.vars);
  };
  const year = month.getFullYear();
  const m = month.getMonth();
  // Weeks start on Monday, like the worker, staff and "My calendar" views.
  const cells = mondayFirstCells(month);

  const byDay = new Map<string, ClientCalendarDto[]>();
  for (const request of requests) {
    const key = requestDayKey(request.startAt, request.timezone);
    if (!key) continue;
    const list = byDay.get(key) ?? [];
    list.push(request);
    byDay.set(key, list);
  }

  const monthLabel = new Date(year, m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = mondayFirstWeekdays(locale);
  const todayKey = requestDayKey(new Date().toISOString(), "America/Toronto");

  return (
    <div>
      <div style={gridStyles.monthBar}>
        <button type="button" onClick={onPrev} aria-label={t("calendar.prevMonth")} style={gridStyles.nav}>&#8249;</button>
        <strong style={gridStyles.monthLabel}>{monthLabel}</strong>
        <button type="button" onClick={onNext} aria-label={t("calendar.nextMonth")} style={gridStyles.nav}>&#8250;</button>
      </div>
      <div style={gridStyles.weekRow}>
        {weekdays.map((w, i) => (
          <div key={`wd-${i}`} style={gridStyles.weekday}>{w}</div>
        ))}
      </div>
      <div style={gridStyles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`b-${i}`} style={gridStyles.emptyCell} />;
          const key = `${year}-${m}-${day}`;
          const dayRequests = byDay.get(key) ?? [];
          const isExpanded = expanded.has(key);
          const visible = isExpanded ? dayRequests : dayRequests.slice(0, MAX_CHIPS_PER_DAY);
          const hidden = dayRequests.length - visible.length;
          return (
            <div key={key} style={{ ...gridStyles.dayCell, ...(key === todayKey ? gridStyles.dayCellToday : {}) }}>
              <span style={gridStyles.dayNumber}>{day}</span>
              {visible.map((request) => (
                <a
                  key={request.id}
                  href={`/employer/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
                  className="employer-cal-chip"
                  style={clientStatusTone(request)}
                  title={`${request.title} · ${statusText(request)}`}
                >
                  <span className="employer-cal-chip-title">{request.title}</span>
                  <span className="employer-cal-chip-status">{statusText(request)}</span>
                </a>
              ))}
              {hidden > 0 ? (
                <button type="button" onClick={() => setExpanded((p) => new Set(p).add(key))} style={gridStyles.more}>
                  {t("calendar.more", { count: hidden })}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequestCard({ request }: Readonly<{ request: ClientCalendarDto }>) {
  const t = useT();
  return (
    <article style={styles.card}>
      <RequestStatusChip request={request} />
      <h3 style={styles.cardTitle}>{request.title}</h3>
      <p style={styles.cardText}>{formatWindow(request)}</p>
      <p style={styles.cardText}>
        {request.numberOfWorkers === 1
          ? t("detail.workersOne")
          : t("detail.workersMany", { count: request.numberOfWorkers })}
      </p>
      {request.actionRequired === "information_required" ? (
        <p aria-live="polite" style={styles.warning}>
          {t("detail.infoRequested", { reason: request.actionRequiredReason ?? "" })}
        </p>
      ) : null}
      <a
        href={`/employer/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
        style={styles.secondaryButton}
      >
        {t("calendar.openDetail")}
      </a>
      {request.status === "draft" || request.actionRequired === "information_required" ? (
        <a
          href={`/employer/calendar/request/edit?id=${encodeURIComponent(request.id)}`}
          style={styles.primaryButton}
        >
          {request.actionRequired === "information_required"
            ? t("calendar.provideInfo")
            : t("create.editDraft")}
        </a>
      ) : null}
    </article>
  );
}

// One small line instead of a full panel: "Signed in as <company>" + a small "Switch account" text
// button. Switching keeps the old behaviour: clear the calendar session, then reload (sign-in shows).
function SessionAction({ onSignedOut }: Readonly<{ onSignedOut: () => Promise<void> }>) {
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const response = await fetch("/api/organizations", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as { displayName?: unknown } | null;
        if (live && typeof payload?.displayName === "string" && payload.displayName.trim()) {
          setName(payload.displayName.trim());
        }
      } catch {
        // The line still reads "You are signed in." without a name.
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const signOut = async () => {
    setSubmitting(true);
    setFailed(false);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setFailed(true);
      await onSignedOut();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <p aria-busy={submitting} aria-live="polite" style={sessionStyles.line}>
      <span style={{ overflowWrap: "anywhere" }}>
        {name ? t("calendar.signedInAs", { name }) : t("calendar.signedIn")}
      </span>
      <button disabled={submitting} onClick={() => void signOut()} style={sessionStyles.link} type="button">
        {submitting ? t("calendar.signingOut") : t("calendar.switchAccount")}
      </button>
      {failed ? <span style={sessionStyles.error}>{t("calendar.signOutFailed")}</span> : null}
    </p>
  );
}

const sessionStyles: Record<string, React.CSSProperties> = {
  line: { alignItems: "baseline", color: "#d3d1c7", display: "flex", flexWrap: "wrap", fontSize: 13, gap: "4px 12px", margin: "0 0 14px" },
  link: { background: "transparent", border: 0, color: "#f8b808", cursor: "pointer", font: "inherit", fontWeight: 700, padding: 0, textDecoration: "underline" },
  error: { color: "#e4756b", fontWeight: 600 }
};

function ClientSignIn() {
  const tx = calendarStateText[langOf(useLocale())];
  return (
    <section style={styles.panel}>
      <h3 style={styles.cardTitle}>{tx.signInTitle}</h3>
      <p style={styles.sectionCopy}>{tx.signInBody}</p>
      <a href="/signin" style={styles.primaryButton}>
        {tx.signIn}
      </a>
    </section>
  );
}

function CalendarState({
  title,
  message,
  action,
  onRetry
}: Readonly<{ title: string; message: string; action?: string; onRetry?: () => Promise<void> }>) {
  const tx = calendarStateText[langOf(useLocale())];
  return (
    <article style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? (
        <a href={action} style={styles.primaryButton}>
          {tx.create}
        </a>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
        >
          {tx.retry}
        </button>
      ) : null}
    </article>
  );
}

function OrganizationPicker({
  organizations,
  onSelected
}: Readonly<{ organizations: readonly OrganizationChoice[]; onSelected: () => Promise<void> }>) {
  const tx = calendarStateText[langOf(useLocale())];
  const [message, setMessage] = useState<"chooseBody" | "chooseFailed" | "chooseUnavailable">("chooseBody");
  const [submitting, setSubmitting] = useState(false);
  const select = async (organizationId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/session/organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId })
      });
      if (!response.ok) return setMessage("chooseFailed");
      await onSelected();
    } catch {
      setMessage("chooseUnavailable");
    } finally {
      setSubmitting(false);
    }
  };
  if (organizations.length === 0) {
    return (
      <article style={styles.tintedCard}>
        <h3 style={styles.cardTitle}>{tx.setupTitle}</h3>
        <p style={styles.cardText}>{tx.setupBody}</p>
        <a href="/employer/onboarding/company" style={styles.primaryButton}>
          {tx.setupAction}
        </a>
      </article>
    );
  }

  return (
    <article aria-busy={submitting} aria-live="polite" style={styles.panel}>
      <h3 style={styles.cardTitle}>{tx.chooseTitle}</h3>
      <p style={styles.sectionCopy}>{tx[message]}</p>
      {organizations.map((organization) => (
        <button
          disabled={submitting}
          key={organization.id}
          onClick={() => void select(organization.id)}
          style={{
            ...styles.secondaryButton,
            cursor: "pointer",
            marginRight: 8,
            maxWidth: "100%",
            overflowWrap: "anywhere",
            whiteSpace: "normal"
          }}
          type="button"
        >
          {organization.displayName} ({organization.publicId})
        </button>
      ))}
    </article>
  );
}

function parseOrganizationContext(
  input: unknown
): Extract<ClientCalendarState, { status: "organization_required" }> | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as { status?: unknown; organizations?: unknown };
  if (record.status !== "organization_required" || !Array.isArray(record.organizations))
    return null;
  const organizations = record.organizations.filter((value): value is OrganizationChoice => {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.publicId === "string" &&
      typeof candidate.displayName === "string"
    );
  });
  return { status: "organization_required", organizations };
}

// Same colours as the status chip, so a request reads the same in the grid, the list and the detail.
function clientStatusTone(request: ClientCalendarDto): { background: string; color: string; border: string } {
  const tone = requestPhaseTone(requestPhase(request));
  return { background: tone.background, color: tone.color, border: `1px solid ${tone.border}` };
}

const gridStyles: Record<string, React.CSSProperties> = {
  // The employer page background is dark, while request cells stay light (the app's card surface).
  // Chrome text (month label, weekday headers, inactive toggle) must therefore read light; the active
  // toggle and the nav buttons carry their own light fills so their dark text stays legible.
  toggleRow: { display: "flex", gap: 8, margin: "0 0 14px" },
  toggle: { background: "transparent", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, color: "#f4efe4", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "6px 16px" },
  toggleActive: { background: "#f8b808", border: "1px solid #f8b808", borderRadius: 999, color: "#15110b", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "6px 16px" },
  monthBar: { alignItems: "center", display: "flex", gap: 14, justifyContent: "center", margin: "4px 0 12px" },
  monthLabel: { color: "#f4efe4", fontSize: 18, minWidth: 180, textAlign: "center" },
  nav: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.3)", borderRadius: 8, color: "#f4efe4", cursor: "pointer", fontSize: 18, minHeight: 36, minWidth: 44 },
  weekRow: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, minmax(0, 1fr))", marginBottom: 6 },
  weekday: { color: "#d3d1c7", fontSize: 12, fontWeight: 700, overflow: "hidden", textAlign: "center" },
  grid: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, minmax(0, 1fr))" },
  emptyCell: { minHeight: 96 },
  dayCell: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, minHeight: 96, minWidth: 0, padding: 4 },
  dayCellToday: { border: "2px solid #f8b808" },
  dayNumber: { color: "#f4efe4", fontSize: 12, fontWeight: 800 },
  // Chip layout and type live in globals.css (.employer-cal-chip) so phones get smaller type.
  more: { background: "transparent", border: "1px solid #ece3d2", borderRadius: 6, color: "#6b6356", cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "3px 6px", textAlign: "left" }
};

function formatWindow(request: ClientCalendarDto) {
  const start = formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
  const end = formatRwosDateTime(request.endAt, {
    timeStyle: "short",
    timeZone: request.timezone
  });
  return start === "Unavailable" || end === "Unavailable" ? "Unavailable" : `${start}–${end}`;
}
