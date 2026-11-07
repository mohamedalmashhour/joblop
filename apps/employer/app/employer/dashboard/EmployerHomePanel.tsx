"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createContractMoney, formatMoney } from "@rwos/shared";
import { useLocale, useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import { styles } from "../employerStyles";
import { attentionItems, summarizeHome, type HomeSources } from "./homeSummary";

type State =
  | { status: "loading" }
  | { status: "setup_required" }
  | { status: "choose_company" }
  | { status: "error" }
  | { status: "ready"; sources: HomeSources; companyName: string | null };

async function readList<T>(response: Response, key: string): Promise<readonly T[] | null> {
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const list = payload?.[key];
  return Array.isArray(list) ? (list as T[]) : null;
}

async function readCompanyName(response: Response): Promise<string | null> {
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as { displayName?: unknown } | null;
  return typeof payload?.displayName === "string" ? payload.displayName : null;
}

function money(minor: number): string {
  return formatMoney(createContractMoney({ amountMinor: minor, currency: "CAD" }));
}

const icons = {
  requests: "M4 6h16M4 12h16M4 18h10",
  timesheets: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  invoices: "M7 3h10v18l-3-2-2 2-2-2-3 2V3ZM10 8h4M10 12h4"
} as const;

function Icon({ path }: { path: string }) {
  return (
    <span aria-hidden="true" style={look.iconTile}>
      <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
        <path d={path} stroke="#c9a24b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </span>
  );
}

function Band({ children }: { children: ReactNode }) {
  return <section style={look.band}>{children}</section>;
}

// The employer's home: what needs them today, read live from their own records. Accounts without a
// company see a first-time setup path instead.
export function EmployerHomePanel() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [requests, timesheets, invoices, company] = await Promise.all([
        fetch("/api/calendar/requests", { cache: "no-store" }),
        fetch("/api/timesheets", { cache: "no-store" }),
        fetch("/api/invoices", { cache: "no-store" }),
        fetch("/api/organizations", { cache: "no-store" })
      ]);
      if (requests.status === 401) return window.location.replace("/signin");
      if (requests.status === 409) {
        const body = (await requests.json().catch(() => null)) as { organizations?: unknown[] } | null;
        return setState({ status: body?.organizations?.length ? "choose_company" : "setup_required" });
      }
      setState({
        status: "ready",
        companyName: await readCompanyName(company),
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
    <button onClick={() => void signOut()} style={look.quietButton} type="button">{t("home.signOut")}</button>
  );

  if (state.status === "loading") {
    return <Band><p aria-live="polite" style={styles.cardText}>{t("home.loading")}</p></Band>;
  }
  if (state.status === "error") {
    return (
      <Band>
        <p style={styles.cardText}>{t("home.loadError")}</p>
        <button onClick={() => void load()} style={styles.secondaryButton} type="button">{t("home.retry")}</button>
      </Band>
    );
  }
  if (state.status === "choose_company") {
    return (
      <>
        <section style={look.hero}>
          <p style={look.eyebrow}>{t("home.eyebrow")}</p>
          <h1 style={look.title}>{t("home.chooseTitle")}</h1>
          <p style={look.lede}>{t("home.chooseBody")}</p>
          <div style={look.actions}>
            <a href="/employer/calendar" style={styles.primaryButton}>{t("home.chooseAction")}</a>
            {signOutButton}
          </div>
        </section>
      </>
    );
  }
  if (state.status === "setup_required") {
    const steps: readonly [MessageKey, MessageKey][] = [
      ["home.step1Title", "home.step1Body"],
      ["home.step2Title", "home.step2Body"],
      ["home.step3Title", "home.step3Body"]
    ];
    return (
      <>
        <section style={look.hero}>
          <p style={look.eyebrow}>{t("home.setupEyebrow")}</p>
          <h1 style={look.title}>{t("home.setupTitle")}</h1>
          <p style={look.lede}>{t("home.setupBody")}</p>
          <div style={look.actions}>
            <a href="/employer/onboarding/company" style={styles.primaryButton}>{t("home.setupAction")}</a>
            {signOutButton}
          </div>
        </section>
        <Band>
          <ol style={look.steps}>
            {steps.map(([title, body], index) => (
              <li key={title} style={index === 0 ? look.stepCurrent : look.step}>
                <span aria-hidden="true" style={index === 0 ? look.stepNumberCurrent : look.stepNumber}>{index + 1}</span>
                <strong style={look.cardTitle}>{t(title)}</strong>
                <span style={styles.cardText}>{t(body)}</span>
              </li>
            ))}
          </ol>
        </Band>
      </>
    );
  }

  const summary = summarizeHome(state.sources);
  const items = attentionItems(summary);
  const number = (value: number | null) => (value === null ? "—" : String(value));
  const amount = money(summary.invoicesToPayMinor ?? 0);
  const stats = [
    { icon: icons.requests, title: t("home.requests"), value: number(summary.requestCount), note: t("home.requestsNote"), href: "/employer/calendar" },
    { icon: icons.timesheets, title: t("home.timesheets"), value: number(summary.timesheetsToConfirm), note: t("home.timesheetsNote"), href: "/employer/timesheets" },
    {
      icon: icons.invoices,
      title: t("home.invoices"),
      value: number(summary.invoicesToPay),
      note: summary.invoicesToPay ? t("home.invoicesNote", { amount }) : t("home.invoicesClear"),
      href: "/employer/invoices"
    }
  ];
  const attentionText = (kind: (typeof items)[number]["kind"], count: number) =>
    kind === "info"
      ? t("home.actionInfo", { count: String(count) })
      : kind === "timesheets"
        ? t("home.actionTimesheets", { count: String(count) })
        : t("home.actionInvoices", { count: String(count), amount });
  const shortcuts: readonly [string, MessageKey][] = [
    ["/employer/orders", "home.shortOrders"],
    ["/employer/money", "home.shortMoney"],
    ["/employer/contract", "home.shortContract"],
    ["/employer/contact-joblop", "home.shortContact"]
  ];

  return (
    <>
      <section style={look.hero}>
        <p style={look.eyebrow}>{t("home.eyebrow")}</p>
        <h1 style={look.title}>
          {state.companyName ? t("home.welcomeName", { name: state.companyName }) : t("home.welcome")}
        </h1>
        <p style={look.lede}>{t("home.subtitle")}</p>
        <div style={look.actions}>
          <a href="/employer/calendar/create" style={styles.primaryButton}>{t("home.requestWorkers")}</a>
          <a href="/employer/calendar" style={styles.secondaryButton}>{t("home.viewCalendar")}</a>
        </div>
      </section>

      <Band>
        <div style={look.statGrid}>
          {stats.map((stat) => (
            <a href={stat.href} key={stat.href} style={look.stat}>
              <Icon path={stat.icon} />
              <span style={look.statValue}>{stat.value}</span>
              <span style={look.cardTitle}>{stat.title}</span>
              <span style={styles.cardText}>{stat.note}</span>
            </a>
          ))}
        </div>

        <div style={look.columns}>
          <div>
            <h2 style={look.heading}>{t("home.attention")}</h2>
            {items.length === 0 ? <p style={look.row}>✓ {t("home.caughtUp")}</p> : null}
            {items.map((item) => (
              <a href={item.href} key={item.kind} style={look.rowAttention}>
                <span>{attentionText(item.kind, item.count)}</span>
                <strong style={look.link}>{t("home.review")}</strong>
              </a>
            ))}
          </div>
          <div>
            <h2 style={look.heading}>{t("home.upcoming")}</h2>
            {summary.upcomingShifts.length === 0 ? <p style={look.row}>{t("home.noUpcoming")}</p> : null}
            {summary.upcomingShifts.map((shift) => {
              const start = new Date(shift.startAt);
              const part = (options: Intl.DateTimeFormatOptions) =>
                new Intl.DateTimeFormat(locale, { ...options, timeZone: shift.timezone }).format(start);
              return (
                <a
                  href={`/employer/calendar/request?request=${encodeURIComponent(shift.requestNumber)}`}
                  key={shift.requestNumber}
                  style={look.row}
                >
                  <span style={look.dateChip}>
                    <strong style={{ fontSize: 18 }}>{part({ day: "numeric" })}</strong>
                    <span style={{ fontSize: 11 }}>{part({ month: "short" })}</span>
                  </span>
                  <span style={{ display: "grid", flex: 1, gap: 2, minWidth: 0 }}>
                    <strong style={look.shiftTitle}>{shift.title}</strong>
                    <span style={styles.cardText}>{part({ hour: "numeric", minute: "2-digit" })}</span>
                  </span>
                  <span style={look.pill}>{t(`home.status_${shift.status}` as MessageKey)}</span>
                </a>
              );
            })}
          </div>
        </div>

        <h2 style={look.heading}>{t("home.shortcuts")}</h2>
        <div style={look.actions}>
          {shortcuts.map(([href, label]) => (
            <a href={href} key={href} style={styles.secondaryButton}>{t(label)}</a>
          ))}
          {signOutButton}
        </div>
      </Band>
    </>
  );
}

const gold = "#c9a24b";
const raised = "#141210";
const hairline = "rgba(201, 162, 75, 0.2)";
const cream = "#f4efe4";
const serif = "var(--font-serif), Georgia, serif";

const look: Record<string, CSSProperties> = {
  hero: {
    background: "radial-gradient(circle at 85% 10%, rgba(201, 162, 75, 0.2), transparent 45%), linear-gradient(135deg, #000000 0%, #2a2114 100%)",
    borderBottom: `1px solid ${hairline}`,
    padding: "clamp(36px, 6vw, 72px) clamp(16px, 4vw, 40px)"
  },
  eyebrow: { color: gold, fontSize: 13, fontWeight: 800, letterSpacing: 1, margin: 0, textTransform: "uppercase" },
  title: { color: "#ffffff", fontFamily: serif, fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.08, margin: "12px 0" },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.5, margin: 0, maxWidth: 620 },
  actions: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 },
  band: { display: "grid", gap: 16, padding: "clamp(24px, 4vw, 40px) clamp(16px, 4vw, 40px) 48px" },
  statGrid: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" },
  stat: { background: raised, border: `1px solid ${hairline}`, borderRadius: 14, color: cream, display: "grid", gap: 6, padding: 20, textDecoration: "none" },
  iconTile: { alignItems: "center", background: "rgba(201, 162, 75, 0.12)", borderRadius: 10, display: "inline-flex", height: 40, justifyContent: "center", width: 40 },
  statValue: { color: gold, fontFamily: serif, fontSize: 42, fontVariantNumeric: "lining-nums", fontWeight: 700, lineHeight: 1.1 },
  cardTitle: { color: cream, fontSize: 16, fontWeight: 800 },
  columns: { display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginTop: 8 },
  heading: { color: "#ffffff", fontFamily: serif, fontSize: 24, margin: "16px 0 12px" },
  row: { alignItems: "center", background: raised, border: `1px solid ${hairline}`, borderRadius: 12, color: cream, display: "flex", gap: 12, margin: "0 0 10px", padding: "12px 14px", textDecoration: "none" },
  rowAttention: { alignItems: "center", background: "rgba(201, 162, 75, 0.1)", border: `1px solid ${gold}`, borderRadius: 12, color: cream, display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 10, padding: "14px 16px", textDecoration: "none" },
  link: { color: gold, flex: "none" },
  dateChip: { alignItems: "center", background: "#000000", border: `1px solid ${hairline}`, borderRadius: 10, color: cream, display: "grid", flex: "none", justifyItems: "center", padding: "6px 10px" },
  shiftTitle: { color: cream, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pill: { border: `1px solid ${hairline}`, borderRadius: 999, color: gold, flex: "none", fontSize: 12, fontWeight: 700, padding: "4px 10px" },
  quietButton: { background: "transparent", border: 0, color: "#b3a894", cursor: "pointer", font: "inherit", fontWeight: 700, padding: "10px 6px", textDecoration: "underline" },
  steps: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", listStyle: "none", margin: 0, padding: 0 },
  step: { alignContent: "start", background: raised, border: `1px solid ${hairline}`, borderRadius: 14, display: "grid", gap: 8, justifyItems: "start", padding: 20 },
  stepCurrent: { alignContent: "start", background: raised, border: `1px solid ${gold}`, borderRadius: 14, display: "grid", gap: 8, justifyItems: "start", padding: 20 },
  stepNumber: { alignItems: "center", border: `1px solid ${hairline}`, borderRadius: 999, color: cream, display: "inline-flex", fontWeight: 800, height: 32, justifyContent: "center", width: 32 },
  stepNumberCurrent: { alignItems: "center", background: gold, borderRadius: 999, color: "#000000", display: "inline-flex", fontWeight: 800, height: 32, justifyContent: "center", width: 32 }
};
