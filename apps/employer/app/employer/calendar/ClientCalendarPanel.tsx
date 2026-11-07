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

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type ClientCalendarState =
  | AuthenticatedViewState<readonly ClientCalendarDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

export function ClientCalendarPanel() {
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
        title="Loading request calendar"
        message="Checking your authenticated organization context."
      />
    );
  if (state.status === "denied") return <ClientSignIn onSignedIn={load} />;
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
          title="No persisted requests"
          message="No governed requests exist for this organization yet."
          action="/employer/calendar/create"
        />
      </>
    );
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <CalendarState
        title={
          state.status === "unavailable"
            ? "Calendar unavailable"
            : state.status === "stale"
              ? "Calendar changed"
              : "Calendar could not be loaded"
        }
        message="No fixture records are shown as persisted data. Retry when the service is available."
        onRetry={load}
      />
    );
  }

  return (
    <>
      <SessionAction onSignedOut={load} />
      {state.status === "partial" ? (
        <CalendarState
          title="Some requests could not be shown"
          message="The records below passed the client privacy whitelist. Retry to check for the remaining records."
          onRetry={load}
        />
      ) : null}
      <div style={gridStyles.toggleRow}>
        <button
          type="button"
          onClick={() => setView("calendar")}
          style={view === "calendar" ? gridStyles.toggleActive : gridStyles.toggle}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          style={view === "list" ? gridStyles.toggleActive : gridStyles.toggle}
        >
          List
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
          {state.data.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </>
  );
}

const MAX_CHIPS_PER_DAY = 3;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

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
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const year = month.getFullYear();
  const m = month.getMonth();
  const startWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<string, ClientCalendarDto[]>();
  for (const request of requests) {
    const parsed = new Date(request.startAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = dayKey(parsed);
    const list = byDay.get(key) ?? [];
    list.push(request);
    byDay.set(key, list);
  }

  const monthLabel = new Date(year, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: "short" }));
  const todayKey = dayKey(new Date());

  return (
    <div>
      <div style={gridStyles.monthBar}>
        <button type="button" onClick={onPrev} aria-label="Previous month" style={gridStyles.nav}>&#8249;</button>
        <strong style={gridStyles.monthLabel}>{monthLabel}</strong>
        <button type="button" onClick={onNext} aria-label="Next month" style={gridStyles.nav}>&#8250;</button>
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
                  style={{ ...gridStyles.chip, ...clientStatusTone(request.status) }}
                  title={`${request.title} · ${request.status.replaceAll("_", " ")}`}
                >
                  <span style={gridStyles.chipTitle}>{request.title}</span>
                  <span style={gridStyles.chipStatus}>{request.status.replaceAll("_", " ")}</span>
                </a>
              ))}
              {hidden > 0 ? (
                <button type="button" onClick={() => setExpanded((p) => new Set(p).add(key))} style={gridStyles.more}>
                  +{hidden} more
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
  return (
    <article style={styles.card}>
      <span style={clientStatusStyle(request.status)}>{request.status.replaceAll("_", " ")}</span>
      <h3 style={styles.cardTitle}>{request.title}</h3>
      <p style={styles.cardText}>{formatWindow(request)}</p>
      <p style={styles.cardText}>
        {request.numberOfWorkers} worker{request.numberOfWorkers === 1 ? "" : "s"} requested
      </p>
      {request.actionRequired === "information_required" ? (
        <p aria-live="polite" style={styles.warning}>
          Information requested: {request.actionRequiredReason}
        </p>
      ) : null}
      <a
        href={`/employer/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
        style={styles.secondaryButton}
      >
        Open request detail
      </a>
      {request.status === "draft" || request.actionRequired === "information_required" ? (
        <a
          href={`/employer/calendar/request/edit?id=${encodeURIComponent(request.id)}`}
          style={styles.primaryButton}
        >
          {request.actionRequired === "information_required"
            ? "Provide requested information"
            : "Edit draft"}
        </a>
      ) : null}
    </article>
  );
}

function SessionAction({ onSignedOut }: Readonly<{ onSignedOut: () => Promise<void> }>) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Authenticated employer calendar session.");
  const signOut = async () => {
    setSubmitting(true);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setMessage("Session could not be cleared. Try again.");
      await onSignedOut();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div aria-busy={submitting} aria-live="polite" style={{ ...styles.panel, marginBottom: 18 }}>
      <p style={styles.sectionCopy}>{message}</p>
      <button
        disabled={submitting}
        onClick={() => void signOut()}
        style={{ ...styles.secondaryButton, cursor: "pointer" }}
        type="button"
      >
        {submitting ? "Signing out…" : "Switch employer account"}
      </button>
    </div>
  );
}

function ClientSignIn({ onSignedIn }: Readonly<{ onSignedIn: () => Promise<void> }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    "Sign in to load your organization’s persisted request calendar."
  );
  const [needsSignOut, setNeedsSignOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setNeedsSignOut(false);
    try {
      const response = await fetch("/api/session/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      setPassword("");
      if (!response.ok) {
        setNeedsSignOut(response.status === 409);
        return setMessage(
          response.status === 409 ? "Sign out before changing accounts." : "Sign-in failed."
        );
      }
      await onSignedIn();
    } catch {
      setMessage("Sign-in service unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const signOut = async () => {
    setSubmitting(true);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setMessage("Session could not be cleared. Try again.");
      setNeedsSignOut(false);
      setMessage("Local session cleared. Sign in with the intended employer account.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form aria-busy={submitting} onSubmit={submit} style={styles.panel}>
      <h3 style={styles.cardTitle}>Employer sign-in required</h3>
      <p aria-live="polite" style={styles.sectionCopy}>
        {message}
      </p>
      <label style={styles.fieldLabel}>
        Email
        <input
          autoComplete="username"
          disabled={submitting}
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={styles.input}
        />
      </label>
      <label style={styles.fieldLabel}>
        Password
        <input
          autoComplete="current-password"
          disabled={submitting}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={styles.input}
        />
      </label>
      <button
        disabled={submitting}
        type="submit"
        style={{ ...styles.primaryButton, border: 0, opacity: submitting ? 0.65 : 1 }}
      >
        {submitting ? "Checking account…" : "Sign in securely"}
      </button>
      {needsSignOut ? (
        <button
          disabled={submitting}
          type="button"
          onClick={() => void signOut()}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
        >
          Clear prior session
        </button>
      ) : null}
    </form>
  );
}

function CalendarState({
  title,
  message,
  action,
  onRetry
}: Readonly<{ title: string; message: string; action?: string; onRetry?: () => Promise<void> }>) {
  return (
    <article style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? (
        <a href={action} style={styles.primaryButton}>
          Create staffing request
        </a>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
        >
          Retry
        </button>
      ) : null}
    </article>
  );
}

function OrganizationPicker({
  organizations,
  onSelected
}: Readonly<{ organizations: readonly OrganizationChoice[]; onSelected: () => Promise<void> }>) {
  const [message, setMessage] = useState(
    "Choose the organization whose persisted calendar you are authorized to access."
  );
  const [submitting, setSubmitting] = useState(false);
  const select = async (organizationId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/session/organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId })
      });
      if (!response.ok) return setMessage("Organization access could not be selected.");
      await onSelected();
    } catch {
      setMessage("Organization selection is unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  };
  if (organizations.length === 0) {
    return (
      <article style={styles.tintedCard}>
        <h3 style={styles.cardTitle}>Set up your company</h3>
        <p style={styles.cardText}>You are signed in. Add your company details to start requesting workers.</p>
        <a href="/employer/onboarding/company" style={styles.primaryButton}>
          Set up my company
        </a>
      </article>
    );
  }

  return (
    <article aria-busy={submitting} aria-live="polite" style={styles.panel}>
      <h3 style={styles.cardTitle}>Select organization</h3>
      <p style={styles.sectionCopy}>{message}</p>
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

function clientStatusTone(status: ClientCalendarDto["status"]): { background: string; color: string; border: string } {
  const [background, color]: readonly [string, string] =
    status === "cancelled"
      ? ["#fdecec", "#8a1c1c"]
      : status === "under_review"
        ? ["#fff8d8", "#725000"]
        : status === "assigned" || status === "in_progress"
          ? ["#e7f3ee", "#15624a"]
          : status === "completed"
            ? ["#eef3e3", "#3b6d11"]
            : status === "submitted" || status === "published"
              ? ["#eaf1fb", "#185fa5"]
              : ["#f1efe8", "#3a3326"];
  return { background, color, border: `1px solid ${color}22` };
}

function clientStatusStyle(status: ClientCalendarDto["status"]) {
  const tone = clientStatusTone(status);
  return { ...styles.pill, background: tone.background, color: tone.color };
}

const gridStyles: Record<string, React.CSSProperties> = {
  // The employer page background is dark, while request cells stay light (the app's card surface).
  // Chrome text (month label, weekday headers, inactive toggle) must therefore read light; the active
  // toggle and the nav buttons carry their own light fills so their dark text stays legible.
  toggleRow: { display: "flex", gap: 8, margin: "0 0 14px" },
  toggle: { background: "transparent", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, color: "#f4efe4", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "6px 16px" },
  toggleActive: { background: "#c9a24b", border: "1px solid #c9a24b", borderRadius: 999, color: "#15110b", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "6px 16px" },
  monthBar: { alignItems: "center", display: "flex", gap: 14, justifyContent: "center", margin: "4px 0 12px" },
  monthLabel: { color: "#f4efe4", fontSize: 18, minWidth: 180, textAlign: "center" },
  nav: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.3)", borderRadius: 8, color: "#f4efe4", cursor: "pointer", fontSize: 18, minHeight: 36, minWidth: 44 },
  weekRow: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 },
  weekday: { color: "#d3d1c7", fontSize: 12, fontWeight: 700, textAlign: "center" },
  grid: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)" },
  emptyCell: { minHeight: 96 },
  dayCell: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, minHeight: 96, padding: 6 },
  dayCellToday: { border: "2px solid #c9a24b" },
  dayNumber: { color: "#f4efe4", fontSize: 12, fontWeight: 800 },
  chip: { borderRadius: 6, display: "grid", gap: 1, padding: "4px 6px", textDecoration: "none" },
  chipTitle: { fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chipStatus: { fontSize: 10, fontWeight: 600, textTransform: "capitalize" },
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
