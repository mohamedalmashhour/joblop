"use client";

import { useState } from "react";
import type { CoverageText } from "./text";
import { useLocale } from "../../i18n/LocaleProvider";
import { adminMoney } from "../../i18n/adminFormat";
import type { AdminLocale } from "../../i18n/config";

// Job bonus controls on a coverage card. Staff first OFFER a bonus to the employer (the employer
// pays if they accept); if the employer says no, staff can APPROVE it from Joblop's share, capped
// at that share unless "urgent" is ticked. The API is authoritative for the cap and for the
// one-active-bonus rule; this only collects the choice and explains refusals in plain words.

export type BonusKind = "hourly" | "transport" | "one_time";
export type BonusStatus = "offered_to_employer" | "employer_accepted" | "employer_declined" | "approved" | "cancelled";

export type JobBonus = Readonly<{
  id: string;
  kind: BonusKind;
  amountMinor: number;
  fundedBy: "employer" | "platform";
  status: BonusStatus;
}>;

export type BonusSuggestion = Readonly<{
  kind: "hourly";
  amountMinor: number;
  oneTimeEquivalentMinor: number;
  platformCapHourlyMinor: number;
  platformCapShiftMinor: number;
  reason: string;
}>;

const KINDS: readonly BonusKind[] = ["hourly", "transport", "one_time"];

export function isActiveBonus(bonus: JobBonus | null | undefined): boolean {
  return bonus?.status === "employer_accepted" || bonus?.status === "approved";
}

/** CAD in the admin's language (en-CA when none is given), never the browser's locale. */
export function formatMoney(minor: number, locale: AdminLocale = "en-CA"): string {
  return adminMoney(minor, "CAD", locale);
}

export function bonusAmountLabel(kind: string, amountMinor: number, t: CoverageText, locale: AdminLocale = "en-CA"): string {
  return kind === "hourly" ? t.bonusAmountHourly(formatMoney(amountMinor, locale)) : t.bonusAmountShift(formatMoney(amountMinor, locale));
}

function dollarsFromMinor(minor: number | null | undefined): string {
  return typeof minor === "number" && minor > 0 ? (minor / 100).toFixed(2) : "";
}

function suggestedFor(kind: BonusKind, suggestion: BonusSuggestion | null): number | null {
  if (!suggestion) return null;
  return kind === "hourly" ? suggestion.amountMinor : suggestion.oneTimeEquivalentMinor;
}

export function BonusSection({
  jobRequestId,
  bonus,
  initialSuggestion,
  canAdd,
  t,
  onChanged
}: Readonly<{
  jobRequestId: string;
  bonus: JobBonus | null;
  initialSuggestion: BonusSuggestion | null;
  canAdd: boolean;
  t: CoverageText;
  onChanged: () => void;
}>) {
  const adminLocale = useLocale();
  // A bonus that is offered, accepted or approved blocks a new one until it is cancelled.
  const blocking = bonus !== null && bonus.status !== "cancelled" && bonus.status !== "employer_declined";
  const showForm = canAdd && !blocking;
  const declined = bonus?.status === "employer_declined";

  const [open, setOpen] = useState(() => showForm && initialSuggestion !== null);
  const [suggestion, setSuggestion] = useState<BonusSuggestion | null>(initialSuggestion);
  const [fetched, setFetched] = useState(initialSuggestion !== null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [kind, setKind] = useState<BonusKind>(declined && bonus ? bonus.kind : "hourly");
  const [amount, setAmount] = useState(() =>
    declined && bonus ? dollarsFromMinor(bonus.amountMinor) : dollarsFromMinor(initialSuggestion?.amountMinor)
  );
  const [reason, setReason] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function openForm() {
    setOpen(true);
    if (fetched) return;
    setLoadingSuggestion(true);
    try {
      const response = await fetch(`/api/bonuses/job-requests/${encodeURIComponent(jobRequestId)}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { suggestion?: BonusSuggestion | null };
        const next = payload.suggestion ?? null;
        setSuggestion(next);
        if (next && !amount) setAmount(dollarsFromMinor(suggestedFor(kind, next)));
      }
    } catch {
      // The form still works without a suggestion.
    } finally {
      setFetched(true);
      setLoadingSuggestion(false);
    }
  }

  function changeKind(next: BonusKind) {
    setKind(next);
    const suggested = suggestedFor(next, suggestion);
    if (suggested !== null) setAmount(dollarsFromMinor(suggested));
  }

  function errorText(status: number, code: unknown): string {
    if (status === 422 && code === "over_platform_share") return t.bonusErrorOverShare;
    if (status === 409) return t.bonusErrorActive;
    if (status === 401 || status === 403) return t.bonusErrorDenied;
    return t.bonusErrorGeneric;
  }

  async function submit(fundedBy: "employer" | "platform") {
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setMessage({ tone: "error", text: t.bonusErrorAmount });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bonuses/job-requests/${encodeURIComponent(jobRequestId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          amountMinor,
          fundedBy,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          ...(fundedBy === "platform" && urgent ? { urgentOverride: true } : {})
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { status?: unknown } | null;
        setMessage({ tone: "error", text: errorText(response.status, payload?.status) });
        return;
      }
      setMessage({ tone: "ok", text: t.bonusSaved });
      onChanged();
    } catch {
      setMessage({ tone: "error", text: t.bonusErrorGeneric });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!bonus || !window.confirm(t.bonusCancelConfirm)) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bonuses/${encodeURIComponent(bonus.id)}/cancel`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { status?: unknown } | null;
        setMessage({ tone: "error", text: errorText(response.status, payload?.status) });
        return;
      }
      setMessage({ tone: "ok", text: t.bonusCancelled });
      onChanged();
    } catch {
      setMessage({ tone: "error", text: t.bonusErrorGeneric });
    } finally {
      setBusy(false);
    }
  }

  if (!bonus && !showForm) return null;

  const capMinor = suggestion ? (kind === "hourly" ? suggestion.platformCapHourlyMinor : suggestion.platformCapShiftMinor) : null;

  return (
    <div style={styles.box}>
      <p style={styles.label}>{t.bonusTitle}</p>

      {bonus ? (
        <div style={styles.current}>
          <span style={styles.status}>{t.bonusStatus[bonus.status] ?? bonus.status}</span>
          <span style={styles.meta}>
            {t.bonusKindLabel[bonus.kind] ?? bonus.kind} · <strong style={styles.strong}>{bonusAmountLabel(bonus.kind, bonus.amountMinor, t, adminLocale)}</strong>
          </span>
          {bonus.status !== "cancelled" ? (
            <button disabled={busy} onClick={() => void cancel()} style={styles.ghostButton} type="button">
              {t.bonusCancel}
            </button>
          ) : null}
        </div>
      ) : null}

      {showForm && !open ? (
        <button onClick={() => void openForm()} style={styles.ghostButton} type="button">
          {t.bonusAdd}
        </button>
      ) : null}

      {showForm && open ? (
        <div style={styles.form}>
          {loadingSuggestion ? <p style={styles.meta}>{t.bonusLoading}</p> : null}
          {!loadingSuggestion && suggestion ? (
            <p style={styles.suggestion}>
              {t.bonusSuggested(bonusAmountLabel("hourly", suggestion.amountMinor, t, adminLocale), suggestion.reason)}
            </p>
          ) : null}
          {!loadingSuggestion && fetched && !suggestion ? <p style={styles.meta}>{t.bonusNoSuggestion}</p> : null}

          <div style={styles.fields}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>{t.bonusKind}</span>
              <select disabled={busy} onChange={(e) => changeKind(e.target.value as BonusKind)} style={styles.input} value={kind}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{t.bonusKindLabel[k] ?? k}</option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>{t.bonusAmount}</span>
              <input
                disabled={busy}
                inputMode="decimal"
                min="0"
                onChange={(e) => setAmount(e.target.value)}
                step="0.25"
                style={styles.input}
                type="number"
                value={amount}
              />
            </label>
            <label style={{ ...styles.field, flex: "2 1 220px" }}>
              <span style={styles.fieldLabel}>{t.bonusReason}</span>
              <input disabled={busy} maxLength={500} onChange={(e) => setReason(e.target.value)} style={styles.input} type="text" value={reason} />
            </label>
          </div>

          <div style={styles.actions}>
            {!declined ? (
              <div style={styles.action}>
                <button disabled={busy} onClick={() => void submit("employer")} style={styles.goldButton} type="button">
                  {busy ? t.bonusWorking : t.bonusOffer}
                </button>
                <span style={styles.hint}>{t.bonusOfferHint}</span>
              </div>
            ) : null}
            <div style={styles.action}>
              <button disabled={busy} onClick={() => void submit("platform")} style={declined ? styles.goldButton : styles.ghostButton} type="button">
                {busy ? t.bonusWorking : t.bonusApprove}
              </button>
              {capMinor !== null ? (
                <span style={styles.hint}>
                  {kind === "hourly" ? t.bonusCapHourly(formatMoney(capMinor, adminLocale)) : t.bonusCapShift(formatMoney(capMinor, adminLocale))}
                </span>
              ) : null}
              <label style={styles.check}>
                <input checked={urgent} disabled={busy} onChange={(e) => setUrgent(e.target.checked)} type="checkbox" />
                {t.bonusUrgent}
              </label>
            </div>
          </div>
          <button disabled={busy} onClick={() => setOpen(false)} style={styles.linkButton} type="button">
            {t.bonusHide}
          </button>
        </div>
      ) : null}

      {message ? (
        <p role={message.tone === "error" ? "alert" : "status"} style={message.tone === "error" ? styles.error : styles.ok}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

const styles = {
  box: { background: "#1d1803", border: "1px solid #F8B808", borderRadius: 8, display: "grid", gap: 8, padding: 12 },
  label: { color: "#F8B808", fontSize: 12, fontWeight: 800, margin: 0, textTransform: "uppercase" as const },
  current: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 10 },
  status: { background: "#F8B808", borderRadius: 999, color: "#000", fontSize: 12, fontWeight: 800, padding: "2px 10px" },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  strong: { color: "#fff" },
  suggestion: { color: "#fff1a8", fontSize: 15, fontWeight: 700, margin: 0 },
  form: { display: "grid", gap: 10 },
  fields: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  field: { display: "grid", flex: "1 1 160px", gap: 4 },
  fieldLabel: { color: "#d8d2c4", fontSize: 12, fontWeight: 700 },
  input: { background: "#000", border: "1px solid #3a3a3a", borderRadius: 6, color: "#fff", fontSize: 14, padding: "8px 10px" },
  actions: { display: "flex", flexWrap: "wrap" as const, gap: 16 },
  action: { display: "grid", flex: "1 1 240px", gap: 6, alignContent: "start" },
  goldButton: { background: "#F8B808", border: 0, borderRadius: 6, color: "#000", cursor: "pointer", fontWeight: 800, padding: "10px 14px" },
  ghostButton: { background: "transparent", border: "1px solid #F8B808", borderRadius: 6, color: "#F8B808", cursor: "pointer", fontWeight: 800, justifySelf: "start", padding: "8px 14px" },
  linkButton: { background: "transparent", border: 0, color: "#d8d2c4", cursor: "pointer", justifySelf: "start", padding: 0, textDecoration: "underline" },
  hint: { color: "#d8d2c4", fontSize: 13 },
  check: { alignItems: "center", color: "#ffd9d9", display: "flex", fontSize: 13, gap: 6 },
  ok: { color: "#9be3b4", fontSize: 14, fontWeight: 700, margin: 0 },
  error: { color: "#ffb3b3", fontSize: 14, fontWeight: 700, margin: 0 }
} as const;
