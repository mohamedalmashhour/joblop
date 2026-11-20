"use client";

import { useState, type CSSProperties } from "react";
import { fmtLocale, useLocale, useT } from "../i18n/LocaleProvider";

// The Interac e-transfer instructions for one open order (plans and long-term listings): who to
// send to, the exact amount with taxes, and the short code for the message — each with a Copy
// button — then ONE "I've sent it" button. Money is written like the rest of the site ($56.92).

export type ETransferDetails = Readonly<{
  email: string;
  amountMinor: number;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  reference: string;
  startsAtTrialEnd?: boolean;
  /** A renewal paid ahead starts when the current paid month ends. */
  startsAt?: string | null;
}>;

/** $56.92 / 56,92 $ — always with cents, in the visitor's language. */
export function cents(minor: number, locale: ReturnType<typeof useLocale>): string {
  return (minor / 100).toLocaleString(fmtLocale(locale), { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Read the e-transfer details the API sends with an open order (null when missing). */
export function readETransferDetails(order: Readonly<Record<string, unknown>> | null | undefined): ETransferDetails | null {
  const e = order?.eTransfer as Record<string, unknown> | undefined;
  if (!order || !e || typeof e.email !== "string" || typeof e.reference !== "string") return null;
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  return {
    email: e.email,
    amountMinor: num(e.amountMinor ?? order.totalMinor),
    subtotalMinor: num(order.subtotalMinor),
    gstMinor: num(order.gstMinor),
    qstMinor: num(order.qstMinor),
    reference: e.reference,
    startsAtTrialEnd: e.startsAtTrialEnd === true,
    startsAt: typeof e.startsAt === "string" ? e.startsAt : null
  };
}

function CopyButton({ value, style }: Readonly<{ value: string; style?: CSSProperties }>) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      style={{ ...copyStyle, ...style }}
      aria-label={`${t("plans.copy")}: ${value}`}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? t("plans.copied") : t("plans.copy")}
    </button>
  );
}

export function ETransferBox({
  details,
  startsText,
  busy,
  onSent,
  primaryStyle,
  primaryClassName
}: Readonly<{
  details: ETransferDetails;
  /** What happens after we confirm ("Your plan starts…", "Your job is listed…"). */
  startsText: string;
  busy: boolean;
  onSent: () => void;
  primaryStyle?: CSSProperties | undefined;
  primaryClassName?: string | undefined;
}>) {
  const t = useT();
  const locale = useLocale();
  const amount = cents(details.amountMinor, locale);
  const rows: [string, string, string][] = [
    [t("plans.etransferTo"), details.email, details.email],
    [t("plans.etransferAmount"), amount, (details.amountMinor / 100).toFixed(2)],
    [t("plans.etransferReference"), details.reference, details.reference]
  ];
  return (
    <div style={boxStyle} aria-label={t("plans.etransferTitle")}>
      <p style={titleStyle}>{t("plans.etransferTitle")}</p>
      <p style={textStyle}>{t("plans.etransferHelp")}</p>
      <dl style={listStyle}>
        {rows.map(([label, shown, copyValue]) => (
          <div key={label} style={rowStyle}>
            <dt style={labelStyle}>{label}</dt>
            <dd style={valueStyle}>
              <span dir="ltr" style={valueTextStyle}>{shown}</span>
              <CopyButton value={copyValue} />
            </dd>
          </div>
        ))}
      </dl>
      <p style={textStyle}>
        {t("plans.etransferBreakdown", { subtotal: cents(details.subtotalMinor, locale), gst: cents(details.gstMinor, locale), qst: cents(details.qstMinor, locale) })}
      </p>
      <p style={strongStyle}>
        {details.startsAtTrialEnd
          ? t("plans.paidStartsAtTrialEnd")
          : details.startsAt
            ? t("plans.renewStartsOn", { date: new Date(details.startsAt).toLocaleDateString(fmtLocale(locale), { year: "numeric", month: "long", day: "numeric" }) })
            : startsText}
      </p>
      <button type="button" className={primaryClassName} style={primaryStyle} disabled={busy} onClick={onSent}>
        {t("plans.etransferSent")}
      </button>
    </div>
  );
}

const boxStyle: CSSProperties = { border: "1px solid rgba(248, 184, 8, 0.34)", borderRadius: 10, display: "grid", gap: 8, padding: 14 };
const titleStyle: CSSProperties = { fontSize: 16, fontWeight: 900, margin: 0 };
const textStyle: CSSProperties = { color: "#b3a894", fontSize: 14, lineHeight: 1.5, margin: 0 };
const strongStyle: CSSProperties = { fontSize: 14, fontWeight: 800, margin: 0 };
const listStyle: CSSProperties = { display: "grid", gap: 6, margin: 0 };
const rowStyle: CSSProperties = { display: "grid", gap: 2 };
const labelStyle: CSSProperties = { color: "#b3a894", fontSize: 12, fontWeight: 800, textTransform: "uppercase" };
const valueStyle: CSSProperties = { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, margin: 0 };
const valueTextStyle: CSSProperties = { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" };
const copyStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(248, 184, 8, 0.34)",
  borderRadius: 8,
  color: "#f4efe4",
  cursor: "pointer",
  font: "inherit",
  fontSize: 13,
  fontWeight: 800,
  minHeight: 36,
  padding: "4px 12px"
};
