"use client";

import { useEffect, useMemo, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { minorToDollars, toRoleRates, type CatalogueGroup, type CatalogueRole } from "./rateCard";
import { contractsText } from "./text";
import { SignedOut } from "../shared/SignedOut";

type Organization = Readonly<{ id: string; displayName: string }>;
type Contract = Readonly<{
  version: string;
  signedAt: string | null;
  roleRates: readonly { roleDefinitionId: string; hourlyRateMinor: number }[];
}>;
type Card = Readonly<{ contract: Contract | null; roles: readonly CatalogueRole[]; groups: readonly CatalogueGroup[] }>;
type State = { status: "idle" | "loading" | "denied" | "error" } | { status: "ready"; card: Card };

export function EmployerContractsPanel() {
  const t = usePageText(contractsText);
  const [organizations, setOrganizations] = useState<readonly Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/payroll/organizations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return setState({ status: response.status === 401 || response.status === 403 ? "denied" : "error" });
        setOrganizations(((await response.json()) as { items?: Organization[] }).items ?? []);
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  async function load(id: string) {
    setMessage("");
    if (!id) return setState({ status: "idle" });
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/employer-contracts?organizationId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) return setState({ status: response.status === 401 || response.status === 403 ? "denied" : "error" });
      const payload = (await response.json()) as {
        contract: Contract | null;
        roleDefinitions?: CatalogueRole[];
        workGroups?: CatalogueGroup[];
      };
      setEntries(
        Object.fromEntries((payload.contract?.roleRates ?? []).map((rate) => [rate.roleDefinitionId, minorToDollars(rate.hourlyRateMinor)]))
      );
      setState({
        status: "ready",
        card: { contract: payload.contract, roles: payload.roleDefinitions ?? [], groups: payload.workGroups ?? [] }
      });
    } catch {
      setState({ status: "error" });
    }
  }

  const roles = state.status === "ready" ? state.card.roles : [];
  const preview = useMemo(() => toRoleRates(roles, entries), [roles, entries]);

  async function publish() {
    setBusy(true);
    setMessage(t.publishing);
    try {
      const response = await fetch("/api/employer-contracts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, roleRates: preview.rates })
      });
      if (!response.ok) return setMessage(t.publishFailed);
      await load(organizationId);
      setMessage(t.published);
    } catch {
      setMessage(t.publishUnconfirmed);
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "denied") {
    return <SignedOut compact />;
  }

  const blocked = busy || preview.rates.length === 0 || preview.invalid.length > 0;

  return (
    <section style={styles.wrap}>
      <label style={styles.label}>
        {t.employer}
        <select
          onChange={(event) => { setOrganizationId(event.target.value); void load(event.target.value); }}
          style={styles.input}
          value={organizationId}
        >
          <option value="">{t.chooseEmployer}</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.displayName}</option>
          ))}
        </select>
      </label>
      <p aria-live="polite" role="status" style={styles.text}>{message}</p>
      {state.status === "loading" ? <p style={styles.text}>{t.loading}</p> : null}
      {state.status === "error" ? <p style={styles.text}>{t.loadError}</p> : null}
      {state.status === "ready" ? (
        <>
          <p style={styles.meta}>
            {state.card.contract
              ? t.currentContract(state.card.contract.version, Boolean(state.card.contract.signedAt))
              : t.noContract}
          </p>
          {state.card.groups.map((group) => {
            const groupRoles = roles.filter((role) => role.workGroupId === group.id);
            if (groupRoles.length === 0) return null;
            return (
              <article key={group.id} style={styles.card}>
                <h2 style={styles.heading}>{group.displayLabel}</h2>
                <div style={styles.grid}>
                  {groupRoles.map((role) => (
                    <label key={role.id} style={styles.label}>
                      {t.perHour(role.displayLabel)}
                      <input
                        inputMode="decimal"
                        onChange={(event) => setEntries((previous) => ({ ...previous, [role.id]: event.target.value }))}
                        placeholder={t.notOffered}
                        style={styles.input}
                        value={entries[role.id] ?? ""}
                      />
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
          {preview.invalid.length > 0 ? <p style={styles.text}>{t.fixRates(preview.invalid.join(", "))}</p> : null}
          <p style={styles.meta}>{t.rolesPriced(preview.rates.length)}</p>
          <button disabled={blocked} onClick={() => void publish()} style={blocked ? styles.buttonOff : styles.button} type="button">
            {busy ? t.publishingButton : t.publishButton}
          </button>
        </>
      ) : null}
    </section>
  );
}

const button = { border: 0, borderRadius: 6, cursor: "pointer", fontWeight: 800, justifySelf: "start", padding: "10px 16px" } as const;
const styles = {
  wrap: { display: "grid", gap: 16, maxWidth: 900, padding: "0 clamp(18px, 5vw, 64px) 64px" },
  card: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 8, display: "grid", gap: 12, padding: 20 },
  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  heading: { color: "#fff", fontSize: 20, margin: 0 },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  text: { color: "#faf6ec", fontSize: 16, lineHeight: 1.5, margin: 0 },
  label: { color: "#faf6ec", display: "grid", fontSize: 14, gap: 6 },
  input: { background: "#000000", border: "1px solid #6a6a6a", borderRadius: 6, color: "#faf6ec", font: "inherit", padding: 10 },
  button: { ...button, background: "#fff1a8", color: "#000000" },
  buttonOff: { ...button, background: "#3a3a3a", color: "#b3a894", cursor: "not-allowed" }
} as const;
