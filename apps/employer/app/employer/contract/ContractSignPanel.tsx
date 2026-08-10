"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  formatHourlyRate,
  formatRwosDateTime,
  type EmployerContractDto
} from "@rwos/shared";
import { styles } from "../employerStyles";

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

function failureState(httpStatus: number): PanelState {
  if (httpStatus === 401) return { status: "denied" };
  if (httpStatus === 503) return { status: "unavailable" };
  if (httpStatus === 409) return { status: "stale" };
  return { status: "error" };
}

// Employer contract review + signature. Security: the rate card is read-only and
// server-authoritative; signing POSTs no rates (the browser cannot set a price).
export function ContractSignPanel() {
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
        setSignError("This contract changed. Reloading the latest version.");
        await load();
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setSignError("Only an organization owner or administrator can sign the contract.");
        setSigning(false);
        return;
      }
      if (!response.ok) {
        setSignError("The contract could not be signed. Please try again.");
        setSigning(false);
        return;
      }
      const payload = (await response.json()) as { contract: EmployerContractDto | null };
      setState(stateFromContract(payload.contract ?? null));
      setSigning(false);
    } catch {
      setSignError("The contract could not be signed. Please try again.");
      setSigning(false);
    }
  }, [load]);

  if (state.status === "loading") {
    return (
      <ContractMessage
        title="Loading your contract"
        message="Checking your authenticated organization context."
      />
    );
  }
  if (state.status === "denied") {
    return (
      <ContractMessage
        title="Sign in to view your contract"
        message="The platform contract is shown only for your authenticated organization."
        action={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <ContractMessage
        title="Select your organization"
        message="Choose your organization on the request calendar, then return to review its contract."
        action={{ href: "/employer/calendar", label: "Open request calendar" }}
      />
    );
  }
  if (state.status === "no_contract") {
    return (
      <ContractMessage
        title="No contract published yet"
        message="Your platform rate card has not been published for signing. The platform prepares the governed rates; you will review and sign them here. No fixture rates are shown."
        onRetry={load}
      />
    );
  }
  if (state.status === "unavailable" || state.status === "stale" || state.status === "error") {
    return (
      <ContractMessage
        title={
          state.status === "unavailable"
            ? "Contract service unavailable"
            : state.status === "stale"
              ? "Contract changed"
              : "Contract could not be loaded"
        }
        message="No fixture rates are shown as governed data. Retry when the service is available."
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

      <p style={styles.cardText}>
        These hourly rates are authoritative for every staffing request. A request applies the
        governed rate for the role you choose — it never sets or overrides a price.
      </p>

      {signed ? (
        <div aria-live="polite">
          <p style={styles.cardText}>
            <strong>Signed and active.</strong>{" "}
            {contract.signedAt
              ? `Accepted ${formatRwosDateTime(contract.signedAt, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC.`
              : "This contract is active."}
          </p>
          <a href="/employer/calendar/create" style={styles.primaryButton}>
            Create a staffing request
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
            <span>
              I am authorized to sign for this organization, and I accept the governed rate card
              above (contract {contract.version}) as the authoritative pricing for staffing requests.
            </span>
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
            {signing ? "Signing…" : "Sign contract"}
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
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
      <span style={styles.statusBadge}>{signed ? "signed · active" : "awaiting signature"}</span>
      <h3 style={{ ...styles.cardTitle, margin: 0 }}>Contract {contract.version}</h3>
      <p style={{ ...styles.cardText, margin: 0 }}>
        Currency {contract.currency}
        {contract.effectiveFrom
          ? ` · effective ${formatRwosDateTime(contract.effectiveFrom, { dateStyle: "medium", timeZone: "UTC" })}`
          : ""}
      </p>
    </div>
  );
}

function RateCardTable({ contract }: Readonly<{ contract: EmployerContractDto }>) {
  if (contract.roleRates.length === 0) {
    return <p style={styles.cardText}>This contract has no priced roles yet.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "20rem" }}>
        <caption style={{ ...styles.cardText, textAlign: "left", captionSide: "top", paddingBottom: "0.5rem" }}>
          Governed hourly rate by role
        </caption>
        <thead>
          <tr>
            <th scope="col" style={cellStyle(true)}>Role</th>
            <th scope="col" style={{ ...cellStyle(true), textAlign: "right" }}>Governed hourly rate</th>
          </tr>
        </thead>
        <tbody>
          {contract.roleRates.map((rate) => (
            <tr key={rate.roleDefinitionId}>
              <th scope="row" style={{ ...cellStyle(false), fontWeight: 400 }}>
                {rate.roleLabel ?? "Role"}
              </th>
              <td style={{ ...cellStyle(false), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatHourlyRate({
                  amountMinor: rate.hourlyRateMinor,
                  currency: (rate.currency === "USD" ? "USD" : "CAD") as "CAD" | "USD"
                })}
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
          Retry
        </button>
      ) : null}
    </div>
  );
}
