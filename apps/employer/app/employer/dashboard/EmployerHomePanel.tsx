"use client";

import { useCallback, useEffect, useState } from "react";
import { createContractMoney, formatMoney, formatRwosDateTime } from "@rwos/shared";
import { useLocale, useT } from "../../i18n/LocaleProvider";
import { styles } from "../employerStyles";
import { summarizeHome, type HomeSources } from "./homeSummary";

type State =
  | { status: "loading" }
  | { status: "setup_required" }
  | { status: "choose_company" }
  | { status: "error" }
  | { status: "ready"; sources: HomeSources };

async function readList<T>(response: Response, key: string): Promise<readonly T[] | null> {
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const list = payload?.[key];
  return Array.isArray(list) ? (list as T[]) : null;
}

function money(minor: number): string {
  return formatMoney(createContractMoney({ amountMinor: minor, currency: "CAD" }));
}

// The employer's real home page: what needs them today, read live from their own records.
export function EmployerHomePanel() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [requests, timesheets, invoices] = await Promise.all([
        fetch("/api/calendar/requests", { cache: "no-store" }),
        fetch("/api/timesheets", { cache: "no-store" }),
        fetch("/api/invoices", { cache: "no-store" })
      ]);
      if (requests.status === 401) return window.location.replace("/signin");
      if (requests.status === 409) {
        const body = (await requests.json().catch(() => null)) as { organizations?: unknown[] } | null;
        return setState({ status: body?.organizations?.length ? "choose_company" : "setup_required" });
      }
      setState({
        status: "ready",
        sources: {
          requests: await readList(requests, "requests"),
          timesheets: await readList(timesheets, "timesheets"),
          invoices: await readList(invoices, "invoices")
        }
      });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const signOut = async () => {
    await fetch("/api/session/sign-out", { method: "POST" }).catch(() => undefined);
    window.location.assign("/signin");
  };
  const signOutButton = (
    <button onClick={() => void signOut()} style={styles.secondaryButton} type="button">{t("home.signOut")}</button>
  );

  if (state.status === "loading") {
    return <section style={styles.section}><p aria-live="polite" style={styles.cardText}>{t("home.loading")}</p></section>;
  }
  if (state.status === "error") {
    return (
      <section style={styles.section}>
        <p style={styles.cardText}>{t("home.loadError")}</p>
        <button onClick={() => void load()} style={styles.secondaryButton} type="button">{t("home.retry")}</button>
      </section>
    );
  }
  if (state.status === "setup_required" || state.status === "choose_company") {
    const setup = state.status === "setup_required";
    return (
      <section style={styles.section}>
        <article style={styles.tintedCard}>
          <h2 style={styles.cardTitle}>{t(setup ? "home.setupTitle" : "home.chooseTitle")}</h2>
          <p style={styles.cardText}>{t(setup ? "home.setupBody" : "home.chooseBody")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <a href={setup ? "/employer/onboarding/company" : "/employer/calendar"} style={styles.primaryButton}>
              {t(setup ? "home.setupAction" : "home.chooseAction")}
            </a>
            {signOutButton}
          </div>
        </article>
      </section>
    );
  }

  const summary = summarizeHome(state.sources);
  const number = (value: number | null) => (value === null ? "—" : String(value));
  const cards = [
    { title: t("home.requests"), value: number(summary.requestCount), note: t("home.requestsNote", { count: number(summary.requestsNeedingAction) }), href: "/employer/calendar" },
    { title: t("home.timesheets"), value: number(summary.timesheetsToConfirm), note: t("home.timesheetsNote"), href: "/employer/timesheets" },
    { title: t("home.invoices"), value: number(summary.invoicesToPay), note: summary.invoicesToPayMinor === null ? "" : t("home.invoicesNote", { amount: money(summary.invoicesToPayMinor) }), href: "/employer/invoices" }
  ];

  return (
    <section style={styles.section}>
      <div style={styles.cardGrid}>
        {cards.map((card) => (
          <article key={card.href} style={styles.tintedCard}>
            <h2 style={styles.cardTitle}>{card.title}</h2>
            <p style={{ ...styles.sectionTitle, margin: "8px 0" }}>{card.value}</p>
            <p style={styles.cardText}>{card.note}</p>
            <a href={card.href} style={styles.secondaryButton}>{t("home.open")}</a>
          </article>
        ))}
      </div>
      <h2 style={{ ...styles.cardTitle, marginTop: 24 }}>{t("home.recent")}</h2>
      {summary.recentRequests.length === 0 ? <p style={styles.cardText}>{t("home.noRequests")}</p> : null}
      {summary.recentRequests.map((request) => (
        <p key={request.requestNumber} style={styles.cardText}>
          <a href={`/employer/calendar/request?request=${encodeURIComponent(request.requestNumber)}`} style={{ color: "inherit" }}>
            {request.title}
          </a>
          {" · "}{formatRwosDateTime(request.startAt, { timeZone: request.timezone, locale })}{" · "}{request.status.replaceAll("_", " ")}
        </p>
      ))}
      <div style={{ marginTop: 18 }}>{signOutButton}</div>
    </section>
  );
}
