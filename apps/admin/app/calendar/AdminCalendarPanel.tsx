"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  clearWebCalendarSession,
  formatRwosDateTime,
  parseAdminCalendarList,
  type AdminCalendarDto,
  type AuthenticatedViewState
} from "@rwos/shared";
import { usePageText } from "../i18n/pageText";
import { useLocale } from "../i18n/LocaleProvider";
import { SignedOut } from "../shared/SignedOut";
import { formatHours, intlLocale, parseRequestCards, type RequestCard } from "./requestSummary";
import { calendarText } from "./text";

export function AdminCalendarPanel() {
  const t = usePageText(calendarText).panel;
  const locale = intlLocale(useLocale());
  const [state, setState] = useState<AuthenticatedViewState<readonly AdminCalendarDto[]>>({
    status: "loading"
  });
  const [cards, setCards] = useState<Record<string, RequestCard>>({});
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/calendar/requests", { cache: "no-store" });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = await response.json();
      if (generation === requestGeneration.current) {
        setCards(parseRequestCards((payload as { cards?: unknown } | null)?.cards));
        setState(calendarListState(parseAdminCalendarList(payload)));
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

  if (state.status === "denied") return <SignedOut />;
  if (state.status === "loading")
    return <StateCard title={t.loadingTitle} message={t.loadingMessage} retryLabel={t.retry} />;
  if (state.status === "empty")
    return (
      <>
        <SessionAction />
        <StateCard title={t.emptyTitle} message={t.emptyMessage} retryLabel={t.retry} />
      </>
    );
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <StateCard
        title={
          state.status === "unavailable" ? t.unavailableTitle : t.errorTitle
        }
        message={t.noFixtureMessage}
        onRetry={load}
        retryLabel={t.retry}
      />
    );
  }
  return (
    <>
      <SessionAction />
      {state.status === "partial" ? (
        <StateCard
          title={t.partialTitle}
          message={t.partialMessage}
          onRetry={load}
          retryLabel={t.retry}
        />
      ) : null}
      <section style={styles.grid}>
        {state.data.map((request) => {
          const card = cards[request.id];
          const location = card
            ? [card.locationName, card.locationCity].filter(Boolean).join(", ")
            : request.addressSummary ?? "";
          return (
            <article key={request.id} style={styles.card}>
              <span style={badgeStyle(request.status)}>{request.status.replaceAll("_", " ")}</span>
              <h2 style={styles.h2}>{card?.companyName || t.companyUnknown}</h2>
              <p style={styles.role}>{card?.roleLabel || request.title}</p>
              {location ? <p style={styles.reference}>{location}</p> : null}
              <p style={styles.meta}>
                {t.workersAndHours(request.numberOfWorkers, formatHours(hoursOf(request), locale))}
              </p>
              <p style={styles.meta}>{formatWindow(request)}</p>
              <a
                href={`/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
                style={styles.button}
              >
                {t.openDetail}
              </a>
            </article>
          );
        })}
      </section>
    </>
  );
}

function hoursOf(request: AdminCalendarDto) {
  const hours = (Date.parse(request.endAt) - Date.parse(request.startAt)) / 3_600_000;
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 100) / 100 : 0;
}

// "Signed in as …" with a sign-out button. The name comes from the session; when it is missing the
// line just says you're signed in.
function SessionAction() {
  const t = usePageText(calendarText).panel;
  const [submitting, setSubmitting] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as { user?: { displayName?: unknown; emailNormalized?: unknown } }) : null))
      .then((payload) => {
        const user = payload?.user;
        const value = typeof user?.displayName === "string" && user.displayName.trim()
          ? user.displayName.trim()
          : typeof user?.emailNormalized === "string"
            ? user.emailNormalized
            : null;
        if (live) setName(value);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const signOut = async () => {
    setSubmitting(true);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setClearFailed(true);
      window.location.assign("/signin");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section aria-busy={submitting} aria-live="polite" style={styles.sessionBar}>
      <p style={{ margin: 0 }}>{clearFailed ? t.sessionClearFailed : name ? t.signedInAs(name) : t.sessionMessage}</p>
      <button
        disabled={submitting}
        onClick={() => void signOut()}
        style={styles.retry}
        type="button"
      >
        {submitting ? t.signingOut : t.switchAccount}
      </button>
    </section>
  );
}

function StateCard({
  title,
  message,
  onRetry,
  retryLabel
}: Readonly<{ title: string; message: string; onRetry?: () => Promise<void>; retryLabel: string }>) {
  return (
    <section style={styles.stateCard} aria-live="polite">
      <h2 style={styles.h2}>{title}</h2>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={() => void onRetry()} style={styles.retry}>
          {retryLabel}
        </button>
      ) : null}
    </section>
  );
}

function formatWindow(request: AdminCalendarDto) {
  return formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
}

function badgeStyle(status: string) {
  const danger = status === "cancelled" || status === "rejected";
  const warning = status === "under_review" || status === "paused" || status === "returned";
  const positive = status === "assigned" || status === "in_progress" || status === "completed";
  const informational = status === "submitted" || status === "published" || status === "approved";
  return {
    ...styles.badge,
    background: danger
      ? "#fdecec"
      : warning
        ? "#fff8d8"
        : positive
          ? "#faf6ec"
          : informational
            ? "#fbf9f4"
            : "#fbf9f4",
    color: danger
      ? "#8a1c1c"
      : warning
        ? "#725000"
        : positive
          ? "#171511"
          : informational
            ? "#171511"
            : "#171511"
  };
}

const styles = {
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "32px clamp(18px, 5vw, 64px)"
  },
  card: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,.4)",
    overflowWrap: "anywhere" as const,
    padding: 22
  },
  h2: { color: "#f4efe4", fontSize: 24 },
  badge: {
    borderRadius: 99,
    display: "inline-block",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px",
    textTransform: "uppercase" as const
  },
  button: {
    alignItems: "center",
    background: "#F8B808",
    borderRadius: 8,
    color: "#000000",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    marginTop: 12,
    minHeight: 44,
    padding: "0 16px",
    textDecoration: "none"
  },
  reference: { overflowWrap: "anywhere" as const },
  role: { color: "#F8B808", fontWeight: 800, margin: "4px 0" },
  meta: { color: "#faf6ec", margin: "4px 0" },
  sessionBar: {
    alignItems: "center",
    color: "#b3a894",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "space-between",
    margin: "24px clamp(18px, 5vw, 64px) 0",
    maxWidth: 720
  },
  stateCard: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 14,
    display: "grid",
    gap: 12,
    margin: "32px clamp(18px, 5vw, 64px)",
    maxWidth: 720,
    padding: 24
  },
  label: { display: "grid", fontWeight: 800, gap: 6 },
  input: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  retry: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 16px"
  }
} as const;
