"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  formatHourlyRate,
  formatRwosDateTime,
  type EmployerContractDto
} from "@rwos/shared";
import { styles } from "../employerStyles";
import { fmtLocale, useLocale } from "../../i18n/LocaleProvider";
import { fill, langOf } from "../../i18n/localText";
import { contractText } from "./contractText";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;

type PanelState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>
  | Readonly<{ status: "no_contract" }>
  | Readonly<{ status: "signable"; contract: EmployerContractDto }>
  | Readonly<{ status: "signed"; contract: EmployerContractDto }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "stale" }>
  | Readonly<{ status: "error" }>;

function stateFromContract(contract: EmployerContractDto | null): PanelState {
  if (!contract) return { status: "no_contract" };
  return contract.signedAt ? { status: "signed", contract } : { status: "signable", contract };
}

/** Fill missing role names on `next` from the same roles in `previous` (matched by role id). */
export function withKnownRoleLabels(
  next: EmployerContractDto | null,
  previous: EmployerContractDto | null
): EmployerContractDto | null {
  if (!next || !previous) return next;
  const known = new Map(
    previous.roleRates
      .filter((rate) => rate.roleLabel)
      .map((rate) => [rate.roleDefinitionId, rate.roleLabel] as const)
  );
  return {
    ...next,
    roleRates: next.roleRates.map((rate) => ({
      ...rate,
      roleLabel: rate.roleLabel ?? known.get(rate.roleDefinitionId) ?? null
    }))
  };
}

function failureState(httpStatus: number): PanelState {
  if (httpStatus === 401) return { status: "denied" };
  if (httpStatus === 503) return { status: "unavailable" };
  if (httpStatus === 409) return { status: "stale" };
  return { status: "error" };
}

// Employer contract review + signature. Security: the rate card is read-only and
// server-authoritative; signing POSTs no rates (the browser cannot set a price).
export function ContractSignPanel() {
  const tx = contractText[langOf(useLocale())];
  const [state, setState] = useState<PanelState>({ status: "loading" });
  const [acknowledged, setAcknowledged] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const acknowledgeId = useId();

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    setSignError(null);
    try {
      const response = await fetch("/api/contract", { cache: "no-store" });
      if (generation !== generationRef.current) return;
      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        if (generation !== generationRef.current) return;
        if (body && body.status === "organization_required" && Array.isArray(body.organizations)) {
          return setState({ status: "organization_required", organizations: body.organizations });
        }
        return setState({ status: "stale" });
      }
      if (!response.ok) return setState(failureState(response.status));
      const payload = (await response.json()) as { contract: EmployerContractDto | null };
      if (generation !== generationRef.current) return;
      setState(stateFromContract(payload.contract ?? null));
    } catch {
      if (generation === generationRef.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  const sign = useCallback(async () => {
    setSigning(true);
    setSignError(null);
    try {
      // No rates are sent — the server records only the owner's acceptance.
      const response = await fetch("/api/contract/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (response.status === 409) {
        setSignError(tx.changed);
        await load();
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setSignError(tx.notAllowed);
        setSigning(false);
        return;
      }
      if (!response.ok) {
        setSignError(tx.signFailed);
        setSigning(false);
        return;
      }
      const payload = (await response.json()) as { contract: EmployerContractDto | null };
      // The sign response carries the bare rate card without role names, so keep the names the
      // page already showed (otherwise every row reads "Role" right after signing).
      setState((previous) =>
        stateFromContract(
          withKnownRoleLabels(payload.contract ?? null, "contract" in previous ? previous.contract : null)
        )
      );
      setSigning(false);
    } catch {
      setSignError(tx.signFailed);
      setSigning(false);
    }
  }, [load, tx]);

  if (state.status === "loading") {
    return (
      <ContractMessage
        title={tx.loading}
        message={tx.loadingBody}
      />
    );
  }
  if (state.status === "denied") {
    return (
      <ContractMessage
        title={tx.signInTitle}
        message={tx.signInBody}
        action={{ href: "/signin", label: tx.goToSignIn }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <ContractMessage
        title={tx.chooseCompanyTitle}
        message={tx.chooseCompanyBody}
        action={{ href: "/employer/calendar", label: tx.openCalendar }}
      />
    );
  }
  if (state.status === "no_contract") {
    return (
      <ContractMessage
        title={tx.noContractTitle}
        message={tx.noContractBody}
        onRetry={load}
      />
    );
  }
  if (state.status === "unavailable" || state.status === "stale" || state.status === "error") {
    return (
      <ContractMessage
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

  const { contract } = state;
  const signed = state.status === "signed";

  return (
    <div style={styles.panel}>
      <ContractHeader contract={contract} signed={signed} />
      <RateCardTable contract={contract} />

      <p style={styles.cardText}>{tx.pricesNote}</p>

      {signed ? (
        <div aria-live="polite">
          <p style={styles.cardText}>
            <strong>{tx.signedActive}</strong>{" "}
            {contract.signedAt
              ? fill(tx.acceptedOn, { date: formatRwosDateTime(contract.signedAt, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) })
              : tx.active}
          </p>
          <a href="/employer/calendar/create" style={styles.primaryButton}>
            {tx.createRequest}
          </a>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (acknowledged && !signing) void sign();
          }}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <label
            htmlFor={acknowledgeId}
            style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", ...styles.cardText }}
          >
            <input
              id={acknowledgeId}
              type="checkbox"
              checked={acknowledged}
              disabled={signing}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>{fill(tx.acknowledge, { version: contract.version })}</span>
          </label>
          <button
            type="submit"
            disabled={!acknowledged || signing}
            aria-disabled={!acknowledged || signing}
            style={{
              ...styles.primaryButton,
              cursor: !acknowledged || signing ? "not-allowed" : "pointer",
              opacity: !acknowledged || signing ? 0.6 : 1
            }}
          >
            {signing ? tx.signing : tx.sign}
          </button>
          {signError ? (
            <p aria-live="assertive" role="alert" style={styles.cardText}>
              {signError}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}

function ContractHeader({
  contract,
  signed
}: Readonly<{ contract: EmployerContractDto; signed: boolean }>) {
  const tx = contractText[langOf(useLocale())];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
      <span style={styles.statusBadge}>{signed ? tx.badgeSigned : tx.badgeWaiting}</span>
      <h3 style={{ ...styles.cardTitle, margin: 0 }}>{fill(tx.contractTitle, { version: contract.version })}</h3>
      <p style={{ ...styles.cardText, margin: 0 }}>
        {fill(tx.currency, { currency: contract.currency })}
        {contract.effectiveFrom
          ? fill(tx.effective, { date: formatRwosDateTime(contract.effectiveFrom, { dateStyle: "medium", timeZone: "UTC" }) })
          : ""}
      </p>
    </div>
  );
}

function RateCardTable({ contract }: Readonly<{ contract: EmployerContractDto }>) {
  const locale = useLocale();
  const tx = contractText[langOf(locale)];
  if (contract.roleRates.length === 0) {
    return <p style={styles.cardText}>{tx.noRoles}</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "20rem" }}>
        <caption style={{ ...styles.cardText, textAlign: "left", captionSide: "top", paddingBottom: "0.5rem" }}>
          {tx.tableCaption}
        </caption>
        <thead>
          <tr>
            <th scope="col" style={cellStyle(true)}>{tx.roleHeader}</th>
            <th scope="col" style={{ ...cellStyle(true), textAlign: "right" }}>{tx.rateHeader}</th>
          </tr>
        </thead>
        <tbody>
          {contract.roleRates.map((rate) => (
            <tr key={rate.roleDefinitionId}>
              <th scope="row" style={{ ...cellStyle(false), fontWeight: 400 }}>
                {rate.roleLabel ?? tx.roleFallback}
              </th>
              <td style={{ ...cellStyle(false), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatHourlyRate({
                  amountMinor: rate.hourlyRateMinor,
                  currency: (rate.currency === "USD" ? "USD" : "CAD") as "CAD" | "USD"
                }, fmtLocale(locale))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cellStyle(header: boolean): CSSProperties {
  return {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid rgba(148, 163, 184, 0.35)",
    fontSize: "0.95rem",
    fontWeight: header ? 600 : 400,
    color: "inherit"
  };
}

function ContractMessage({
  title,
  message,
  action,
  onRetry
}: Readonly<{
  title: string;
  message: string;
  action?: Readonly<{ href: string; label: string }>;
  onRetry?: () => void;
}>) {
  const tx = contractText[langOf(useLocale())];
  return (
    <div aria-live="polite" style={styles.panel}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? (
        <a href={action.href} style={styles.primaryButton}>
          {action.label}
        </a>
      ) : null}
      {onRetry ? (
        <button onClick={onRetry} style={{ ...styles.secondaryButton, cursor: "pointer" }} type="button">
          {tx.retry}
        </button>
      ) : null}
    </div>
  );
}
