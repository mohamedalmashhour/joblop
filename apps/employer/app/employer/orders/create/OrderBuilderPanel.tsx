"use client";

import { useEffect, useState } from "react";
import type { EmployerRequestContext } from "../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../employerStyles";
import {
  compareToMarket,
  createContractMoney,
  employerBilledHourlyMinor,
  estimateEmployerRequest,
  formatHourlyRate,
  formatMoney,
  hoursBetween,
  meetsMinimumShiftDuration,
  urgencyPremiumMinor
} from "@rwos/shared";
import { fmtLocale, useLocale, useT } from "../../../i18n/LocaleProvider";

type Urgency = "normal" | "urgent" | "immediate";
type RequestType = "single_day" | "multi_day" | "recurring_intent";

type Shared = {
  residenceId: string;
  departmentId: string;
  timezone: string;
  startAt: string;
  endAt: string;
  urgency: Urgency;
  requestType: RequestType;
  title: string;
  note: string;
  perks: string;
};

type Line = {
  key: string;
  workGroup: string;
  roleDefinition: string;
  numberOfWorkers: string;
  title: string;
  description: string;
};

type CreatedOrder = { id: string; orderNumber: string; children: readonly { jobRequestNumber: string }[] };

const initialShared: Shared = {
  residenceId: "",
  departmentId: "",
  timezone: "America/Toronto",
  startAt: "",
  endAt: "",
  urgency: "normal",
  requestType: "single_day",
  title: "",
  note: "",
  perks: ""
};

let lineCounter = 0;
function newLine(): Line {
  lineCounter += 1;
  return { key: `line-${lineCounter}`, workGroup: "", roleDefinition: "", numberOfWorkers: "1", title: "", description: "" };
}

export function OrderBuilderPanel() {
  const t = useT();
  const locale = useLocale();
  const [context, setContext] = useState<EmployerRequestContext | null>(null);
  const [shared, setShared] = useState<Shared>(initialShared);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [status, setStatus] = useState<
    "loading" | "editing" | "denied" | "error" | "creating" | "created" | "submitting" | "submitted"
  >("loading");
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [marketWages, setMarketWages] = useState<Record<string, { medianHourlyRateMinor: number; currency: string }>>({});

  async function loadContext(residenceId = "") {
    setStatus("loading");
    setMessage(t("order.msgLoading"));
    try {
      const url = new URL("/api/job-requests/context", window.location.origin);
      if (residenceId) url.searchParams.set("residenceId", residenceId);
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (response.status === 401 || response.status === 409) {
        setStatus("denied");
        return setMessage(t("order.msgSelectOrg"));
      }
      if (!response.ok) throw new Error("context");
      setContext((await response.json()) as EmployerRequestContext);
      setStatus("editing");
      setMessage("");
    } catch {
      setStatus("error");
      setMessage(t("order.msgChoicesUnavailable"));
    }
  }

  useEffect(() => {
    void loadContext();
  }, []);

  function updateShared<K extends keyof Shared>(key: K, value: Shared[K]) {
    setShared((cur) => ({ ...cur, [key]: value, ...(key === "residenceId" ? { departmentId: "" } : {}) }));
  }

  async function loadMarketWages(residenceId: string) {
    try {
      const response = await fetch(`/api/market-wages?residenceId=${encodeURIComponent(residenceId)}`, { cache: "no-store" });
      if (!response.ok) return setMarketWages({});
      const payload = (await response.json()) as { marketWages: { roleDefinitionId: string; medianHourlyRateMinor: number; currency: string }[] };
      const map: Record<string, { medianHourlyRateMinor: number; currency: string }> = {};
      for (const m of payload.marketWages ?? []) map[m.roleDefinitionId] = { medianHourlyRateMinor: m.medianHourlyRateMinor, currency: m.currency };
      setMarketWages(map);
    } catch {
      setMarketWages({});
    }
  }

  async function selectResidence(residenceId: string) {
    updateShared("residenceId", residenceId);
    if (residenceId) { await loadContext(residenceId); await loadMarketWages(residenceId); }
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((cur) => cur.map((l) => (l.key === key ? { ...l, ...patch, ...(patch.workGroup !== undefined ? { roleDefinition: "" } : {}) } : l)));
  }

  function rolesForWorkGroup(workGroupSlug: string) {
    const wg = context?.workGroups.find((g) => g.slug === workGroupSlug);
    return context?.roleDefinitions.filter((r) => r.workGroupId === wg?.id) ?? [];
  }

  function lineRole(line: Line) {
    return rolesForWorkGroup(line.workGroup).find((r) => r.slug === line.roleDefinition) ?? null;
  }

  const hours = hoursBetween(shared.startAt, shared.endAt);
  const premiumMinor = urgencyPremiumMinor(shared.urgency);
  const moneyLocale = fmtLocale(locale);
  // Hours as people write them: "6", "6.5" / "6,5", never "6.333333333333333".
  const hoursLabel = hours.toLocaleString(moneyLocale, { maximumFractionDigits: 2 });

  function lineEstimateMinor(line: Line): { minor: number; currency: string } | null {
    const role = lineRole(line);
    if (!role || role.hourlyRateMinor === null || role.currency === null) return null;
    const workers = Number.parseInt(line.numberOfWorkers, 10);
    if (!Number.isInteger(workers) || workers < 1 || hours <= 0) return null;
    // Same rules as the invoices (urgent premium and fee, 6 h minimum); before taxes.
    const est = estimateEmployerRequest({ contractRateMinor: role.hourlyRateMinor, urgency: shared.urgency, shiftHours: hours, shiftCount: 1, workers });
    return { minor: est.subtotalMinor, currency: role.currency };
  }

  const orderTotal = (() => {
    let minor = 0;
    let currency = "CAD";
    let any = false;
    for (const line of lines) {
      const est = lineEstimateMinor(line);
      if (est) { minor += est.minor; currency = est.currency; any = true; }
    }
    return any ? formatMoney(createContractMoney({ amountMinor: minor, currency }), moneyLocale) : null;
  })();

  const departments = context?.departments.filter((d) => d.residenceId === shared.residenceId) ?? [];

  function validate(): string | null {
    if (!shared.residenceId || !shared.departmentId || !shared.timezone || !shared.startAt || !shared.endAt || shared.title.trim().length < 4) {
      return t("order.msgNeedShared");
    }
    if (!meetsMinimumShiftDuration(shared.startAt, shared.endAt)) return t("order.msgMinShift");
    if (lines.length === 0) return t("order.msgNeedLine");
    for (const line of lines) {
      const role = lineRole(line);
      const workers = Number.parseInt(line.numberOfWorkers, 10);
      if (!line.workGroup || !line.roleDefinition || !role || line.title.trim().length < 4 || !Number.isInteger(workers) || workers < 1) {
        return t("order.msgNeedLine");
      }
      if (role.hourlyRateMinor === null) return t("order.msgUnpricedGate");
    }
    return null;
  }

  async function createOrder() {
    const problem = validate();
    if (problem) return setMessage(problem);
    setStatus("creating");
    setMessage(t("order.creating"));
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          residenceId: shared.residenceId,
          departmentId: shared.departmentId,
          title: shared.title.trim(),
          note: shared.note.trim() || null,
          perks: premiumMinor > 0 ? (shared.perks.trim() || null) : null,
          urgency: shared.urgency,
          requestType: shared.requestType,
          timezone: shared.timezone,
          startAt: shared.startAt,
          endAt: shared.endAt,
          lines: lines.map((l) => ({
            workGroup: l.workGroup,
            roleDefinition: l.roleDefinition,
            numberOfWorkers: Number.parseInt(l.numberOfWorkers, 10),
            title: l.title.trim(),
            description: l.description.trim() || undefined
          }))
        })
      });
      if (!response.ok) {
        setStatus("editing");
        return setMessage(t("order.createFailed"));
      }
      const payload = (await response.json()) as { order: CreatedOrder };
      setCreated(payload.order);
      setStatus("created");
      setMessage(t("order.created", { num: payload.order.orderNumber, count: payload.order.children.length }));
    } catch {
      setStatus("editing");
      setMessage(t("order.createFailed"));
    }
  }

  async function submitOrder() {
    if (!created) return;
    setStatus("submitting");
    setMessage(t("order.submitting"));
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(created.id)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      if (!response.ok) {
        setStatus("created");
        return setMessage(t("order.submitFailed"));
      }
      setStatus("submitted");
      setMessage(t("order.submitted", { num: created.orderNumber }));
    } catch {
      setStatus("created");
      setMessage(t("order.submitFailed"));
    }
  }

  return (
    <section style={styles.card}>
      <div style={styles.actionBar}>
        <div>
          <p style={styles.eyebrow}>{t("order.navTitle")}</p>
          <h1 style={styles.cardTitle}>{t("order.createTitle")}</h1>
          <p style={styles.cardText}>{t("order.createLede")}</p>
        </div>
      </div>

      {message ? <p style={styles.cardText} role="status">{message}</p> : null}

      {status === "loading" ? <p style={styles.cardText}>{t("common.loading")}</p> : null}

      {status === "denied" || status === "error" ? (
        <p style={styles.cardText}>
          <a href="/employer/calendar" style={styles.footerLink}>{t("order.backToList")}</a>
        </p>
      ) : null}

      {context && (status === "editing" || status === "creating") ? (
        <>
          <h2 style={styles.cardTitle}>{t("order.sharedDetails")}</h2>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>{t("create.residence")}
              <select style={styles.input} value={shared.residenceId} onChange={(e) => void selectResidence(e.target.value)}>
                <option value="">{t("order.selectPlaceholder", { label: t("create.residence") })}</option>
                {context.residences.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>{t("create.department")}
              <select style={styles.input} value={shared.departmentId} onChange={(e) => updateShared("departmentId", e.target.value)} disabled={!shared.residenceId}>
                <option value="">{t("order.selectPlaceholder", { label: t("create.department") })}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>{t("order.orderTitle")}
              <input style={styles.input} value={shared.title} onChange={(e) => updateShared("title", e.target.value)} maxLength={160} />
            </label>
            <label style={styles.fieldLabel}>{t("create.starts")}
              <input style={styles.input} type="datetime-local" value={shared.startAt} onChange={(e) => updateShared("startAt", e.target.value)} />
            </label>
            <label style={styles.fieldLabel}>{t("create.ends")}
              <input style={styles.input} type="datetime-local" value={shared.endAt} onChange={(e) => updateShared("endAt", e.target.value)} />
            </label>
            <label style={styles.fieldLabel}>{t("create.timezone")}
              <input style={styles.input} value={shared.timezone} onChange={(e) => updateShared("timezone", e.target.value)} />
            </label>
            <label style={styles.fieldLabel}>{t("create.urgency")}
              <select style={styles.input} value={shared.urgency} onChange={(e) => updateShared("urgency", e.target.value as Urgency)}>
                <option value="normal">{t("create.urgencyNormal")}</option>
                <option value="urgent">{t("create.urgencyUrgent")}</option>
                <option value="immediate">{t("create.urgencyImmediate")}</option>
              </select>
            </label>
            <label style={styles.fieldLabel}>{t("create.requestType")}
              <select style={styles.input} value={shared.requestType} onChange={(e) => updateShared("requestType", e.target.value as RequestType)}>
                <option value="single_day">{t("create.typeSingle")}</option>
                <option value="multi_day">{t("create.typeMulti")}</option>
                <option value="recurring_intent">{t("create.typeRecurring")}</option>
              </select>
            </label>
            <label style={styles.fieldLabel}>{t("order.note")}
              <input style={styles.input} value={shared.note} onChange={(e) => updateShared("note", e.target.value)} maxLength={2000} />
            </label>
            {premiumMinor > 0 ? (
              <label style={styles.fieldLabel}>{t("order.perks")}
                <input style={styles.input} value={shared.perks} onChange={(e) => updateShared("perks", e.target.value)} maxLength={500} placeholder={t("order.perksPlaceholder")} />
              </label>
            ) : null}
          </div>

          <h2 style={styles.cardTitle}>{t("order.roleLines")}</h2>
          {premiumMinor > 0 ? <p style={styles.cardText}>{t("order.urgentPremium")}</p> : null}
          {lines.map((line) => {
            const roles = rolesForWorkGroup(line.workGroup);
            const role = lineRole(line);
            const est = lineEstimateMinor(line);
            const unpriced = Boolean(role && role.hourlyRateMinor === null);
            return (
              <div key={line.key} style={{ ...styles.card, marginTop: 12 }}>
                <div style={styles.formGrid}>
                  <label style={styles.fieldLabel}>{t("order.lineWorkGroup")}
                    <select style={styles.input} value={line.workGroup} onChange={(e) => updateLine(line.key, { workGroup: e.target.value })}>
                      <option value="">{t("order.selectPlaceholder", { label: t("order.lineWorkGroup") })}</option>
                      {context.workGroups.map((g) => <option key={g.id} value={g.slug}>{g.displayLabel}</option>)}
                    </select>
                  </label>
                  <label style={styles.fieldLabel}>{t("order.lineRole")}
                    <select style={styles.input} value={line.roleDefinition} onChange={(e) => updateLine(line.key, { roleDefinition: e.target.value })} disabled={!line.workGroup}>
                      <option value="">{t("order.selectPlaceholder", { label: t("order.lineRole") })}</option>
                      {roles.map((r) => <option key={r.slug} value={r.slug}>{r.displayLabel}</option>)}
                    </select>
                  </label>
                  <label style={styles.fieldLabel}>{t("order.lineQuantity")}
                    <input style={styles.input} type="number" min={1} max={50} value={line.numberOfWorkers} onChange={(e) => updateLine(line.key, { numberOfWorkers: e.target.value })} />
                  </label>
                  <label style={styles.fieldLabel}>{t("order.lineTitle")}
                    <input style={styles.input} value={line.title} onChange={(e) => updateLine(line.key, { title: e.target.value })} maxLength={160} />
                  </label>
                  <label style={styles.fieldLabel}>{t("order.lineDescription")}
                    <input style={styles.input} value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} maxLength={2000} />
                  </label>
                </div>
                {role && role.hourlyRateMinor !== null && role.currency ? (
                  <p style={styles.cardText}>
                    {t("order.lineRate")}: {formatHourlyRate(createContractMoney({ amountMinor: employerBilledHourlyMinor(role.hourlyRateMinor, shared.urgency), currency: role.currency }), moneyLocale)}
                    {est ? ` · ${t("order.lineEstimate", { amount: formatMoney(createContractMoney({ amountMinor: est.minor, currency: est.currency }), moneyLocale), hours: hoursLabel, workers: line.numberOfWorkers })}` : ""}
                  </p>
                ) : null}
                {(() => {
                  const market = role ? marketWages[role.roleDefinitionId] : undefined;
                  if (!role || role.hourlyRateMinor === null || !market) return null;
                  const cmp = compareToMarket(role.hourlyRateMinor, market.medianHourlyRateMinor);
                  const cmpLabel = cmp === "below" ? t("order.marketBelow") : cmp === "above" ? t("order.marketAbove") : t("order.marketAt");
                  return (
                    <p style={styles.metaLabel}>
                      {t("order.marketRef")}: {formatHourlyRate(createContractMoney({ amountMinor: market.medianHourlyRateMinor, currency: market.currency }), moneyLocale)}
                      {cmp !== "unknown" ? ` · ${cmpLabel}` : ""}
                    </p>
                  );
                })()}
                {unpriced ? <p style={styles.cardText}>{t("order.lineUnpriced")}</p> : null}
                {lines.length > 1 ? (
                  <button type="button" style={styles.footerLink} onClick={() => setLines((cur) => cur.filter((l) => l.key !== line.key))}>{t("order.removeRole")}</button>
                ) : null}
              </div>
            );
          })}

          <div style={styles.actionBar}>
            <button type="button" style={styles.footerLink} onClick={() => setLines((cur) => [...cur, newLine()])}>{t("order.addRole")}</button>
            {orderTotal ? <p style={styles.cardText}>{t("order.orderTotal")}: {orderTotal}</p> : null}
          </div>

          <div style={styles.actionBar}>
            <button type="button" style={styles.input} disabled={status === "creating"} onClick={() => void createOrder()}>{t("order.create")}</button>
            <a href="/employer/orders" style={styles.footerLink}>{t("order.backToList")}</a>
          </div>
        </>
      ) : null}

      {status === "created" || status === "submitting" ? (
        <div style={styles.actionBar}>
          <button type="button" style={styles.input} disabled={status === "submitting"} onClick={() => void submitOrder()}>{t("order.submitForReview")}</button>
          <a href="/employer/orders" style={styles.footerLink}>{t("order.backToList")}</a>
        </div>
      ) : null}

      {status === "submitted" ? (
        <div style={styles.actionBar}>
          <a href="/employer/orders" style={styles.footerLink}>{t("order.backToList")}</a>
        </div>
      ) : null}
    </section>
  );
}
